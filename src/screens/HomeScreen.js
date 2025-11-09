import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useConversation } from "../context/ConversationContext";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { ChatBubble } from "../components/ChatBubble";
import { colors, gradients, shadows } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { getFirebaseDatabase } from "../services/firebase";
import { ref, push, onValue } from "firebase/database";
import { transcribeAudio, pingServer } from "../services/api";
import { LinearGradient } from "expo-linear-gradient";

const HomeScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const recordingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const webStreamRef = useRef(null);
  const webChunksRef = useRef([]);
  const { logout, user } = useAuth();
  const { conversationState, updateConversationState } = useConversation();
  const conversationIdRef = useRef(
    conversationState.conversationId || `conv-${Date.now()}`
  );

  useEffect(() => {
    if (!conversationState.conversationId) {
      updateConversationState({ conversationId: conversationIdRef.current });
    }
  }, [conversationState.conversationId, updateConversationState]);

  const parseDateValue = useCallback((value) => {
    if (!value && value !== 0) {
      return null;
    }
    if (typeof value === "object" && value?.seconds) {
      return new Date(value.seconds * 1000).toISOString();
    }
    const date =
      typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const db = getFirebaseDatabase();
        if (!db) return;
        const ticketsRef = ref(db, "tickets");
        const off = onValue(ticketsRef, (snapshot) => {
          if (!isMounted) return;
          const value = snapshot.val() || {};
          const userTickets = Object.entries(value)
            .map(([id, ticket]) => ({
              id,
              ...ticket,
              reportedAt:
                parseDateValue(
                  ticket.reportedAt || ticket.createdAt || ticket.timestamp
                ) || null,
            }))
            .filter((t) => t.owner === user?.uid)
            .sort(
              (a, b) =>
                new Date(b.reportedAt || b.timestamp || 0) -
                new Date(a.reportedAt || a.timestamp || 0)
            );
          setTickets(userTickets);
          setLoadingTickets(false);
        });
        return () => off();
      } catch (err) {
        setLoadingTickets(false);
      }
    };
    fetchTickets();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, parseDateValue]);

  useEffect(() => {
    const initPermissions = async () => {
      if (Platform.OS === "web") {
        if (
          !navigator?.mediaDevices?.getUserMedia ||
          typeof window.MediaRecorder === "undefined"
        ) {
          setPermissionGranted(false);
          setError(
            "This browser does not support voice recording. Try another browser or the mobile app."
          );
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          setPermissionGranted(true);
        } catch (err) {
          setPermissionGranted(false);
          setError("Microphone access blocked. Check browser permissions.");
        }
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        setPermissionGranted(granted);
        if (!granted) {
          setError("Microphone access needed. Enable it in settings.");
        }
      }
    };
    initPermissions();
  }, []);

  const stopRecordingAsync = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      return uri;
    } catch (err) {
      recordingRef.current = null;
      return null;
    }
  }, []);

  const stopWebRecordingAsync = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const stream = webStreamRef.current;
    if (!recorder) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const blob = new Blob(webChunksRef.current, { type: "audio/webm" });
          webChunksRef.current = [];
          mediaRecorderRef.current = null;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            webStreamRef.current = null;
          }
          const file = new File([blob], `recording-${Date.now()}.webm`, {
            type: "audio/webm",
          });
          resolve(file);
        } catch (err) {
          reject(err);
        }
      };
      try {
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const startRecordingAsync = useCallback(async () => {
    if (permissionGranted === false) {
      setError("Microphone blocked. Enable access in settings.");
      return;
    }
    setError(null);
    if (Platform.OS === "web") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        webStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        webChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            webChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        setError("Could not start recording. Check permissions.");
      }
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      setError("Recording failed to start. Try again.");
    }
  }, [permissionGranted]);

  const handleTranscription = useCallback(
    async ({ uri, file }) => {
      if (!uri && !file) return;
      setIsProcessing(true);
      try {
        const response = await transcribeAudio({
          uri,
          file,
          conversationId: conversationIdRef.current,
        });
        const transcriptText = response?.transcript ?? "";
        if (!transcriptText) {
          setError("No speech detected. Try again.");
          return;
        }
        setMessages((prev) => {
          const residentMessage = {
            id: `msg-${prev.length + 1}`,
            sender: "Resident",
            text: transcriptText,
            timestamp: Date.now(),
          };
          const resiMessage = {
            id: `msg-${prev.length + 2}`,
            sender: "Resi",
            text: response?.reply || "Thanks! We'll get back to you soon.",
            timestamp: Date.now(),
          };
          return [...prev, residentMessage, resiMessage];
        });

        if (
          response?.classification &&
          !response.classification.needs_more_info &&
          user
        ) {
          const db = getFirebaseDatabase();
          if (db) {
            const ticketsRef = ref(db, "tickets");
            await push(ticketsRef, {
              ...response.classification,
              transcript: transcriptText,
              owner: user.uid,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        setError("Upload failed. Try again.");
      } finally {
        setIsProcessing(false);
        setIsRecording(false);
      }
    },
    [user]
  );

  const finishRecordingAsync = useCallback(async () => {
    if (Platform.OS === "web") {
      const file = await stopWebRecordingAsync();
      await handleTranscription({ file });
    } else {
      const uri = await stopRecordingAsync();
      await handleTranscription({ uri });
    }
  }, [handleTranscription, stopRecordingAsync, stopWebRecordingAsync]);

  const handleMicPress = useCallback(async () => {
    if (isProcessing) return;
    if (isRecording) {
      await finishRecordingAsync();
    } else {
      await startRecordingAsync();
    }
  }, [finishRecordingAsync, isProcessing, isRecording, startRecordingAsync]);

  const handleLogout = async () => {
    const newConversationId = `conv-${Date.now()}`;
    conversationIdRef.current = newConversationId;
    updateConversationState({ conversationId: newConversationId });
    await logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "RoleSelect" }],
      })
    );
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const formatDisplayDate = (value) => {
    if (!value) return "Unknown";
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return formatter.format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroOverlay}
      />
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.eyebrow}>{greeting}</Text>
            <Text style={styles.title}>Welcome back to Resi</Text>
            <Text style={styles.subtitle}>
              Review your past reports and start a new voice ticket whenever you
              spot an issue in your space.
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {loadingTickets ? (
          <Text style={styles.loadingText}>Loading your requests…</Text>
        ) : tickets.length > 0 ? (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const queueLabel = item.queuePosition
                ? `#${item.queuePosition}`
                : "Assigning…";
              return (
                <View style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View>
                      <Text style={styles.ticketLabel}>Request</Text>
                      <Text style={styles.ticketId}>#{item.id}</Text>
                    </View>
                    <View style={styles.ticketQueuePill}>
                      <Text style={styles.ticketQueueText}>Queue {queueLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSummary}>
                    {item.summary || item.transcript}
                  </Text>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketMetaLabel}>Status</Text>
                    <Text style={styles.ticketMetaValue}>{item.status || "Open"}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketMetaLabel}>Urgency</Text>
                    <Text style={styles.ticketMetaValue}>{item.urgency || "Unknown"}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketMetaLabel}>Location</Text>
                    <Text style={styles.ticketMetaValue}>{item.location || "Unknown"}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketMetaLabel}>Reported</Text>
                    <Text style={styles.ticketMetaValue}>
                      {formatDisplayDate(item.reportedAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.ticketList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyTicketState}>
            <Text style={styles.emptyTicketTitle}>No reports submitted yet</Text>
            <Text style={styles.emptyTicketCopy}>
              Once you submit a voice report it will appear here with live status
              updates.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            testID="start-new-chat"
            accessibilityLabel="Start a new chat with the agent"
            style={styles.startChatButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <LinearGradient
              colors={gradients.pill}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.startChatText}>Start Voice Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroOverlay: {
    position: "absolute",
    top: -280,
    left: -160,
    right: -160,
    height: 520,
    opacity: 0.28,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 36,
    gap: 24,
  },
  headerCard: {
    position: "relative",
    borderRadius: 30,
    padding: 28,
    backgroundColor: "rgba(10,16,32,0.88)",
    overflow: "hidden",
    ...shadows.card,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    marginTop: 10,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(226,232,255,0.78)",
    marginTop: 12,
    maxWidth: 540,
    lineHeight: 24,
  },
  logoutButton: {
    position: "absolute",
    right: 22,
    top: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(8,12,26,0.72)",
  },
  logoutText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
  },
  ticketList: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 18,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(127,92,255,0.18)",
    ...shadows.card,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  ticketId: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  ticketQueuePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(127,92,255,0.22)",
  },
  ticketQueueText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  ticketSummary: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 24,
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketMetaLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  ticketMetaValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  emptyTicketState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(127,92,255,0.18)",
    ...shadows.card,
  },
  emptyTicketTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  emptyTicketCopy: {
    fontSize: 14,
    color: colors.muted,
    maxWidth: 260,
    textAlign: "center",
  },
  footer: {
    marginTop: 12,
    alignItems: "center",
  },
  startChatButton: {
    position: "relative",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 48,
    backgroundColor: colors.primaryDark,
    overflow: "hidden",
    ...shadows.card,
  },
  startChatText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default HomeScreen;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { colors, gradients, shadows } from "../theme/colors";
import { useVoice } from "../context/VoiceContext";
import { useAuth } from "../context/AuthContext";

const VOICE_OPTIONS = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Warm and reassuring — ideal for calm, empathetic guidance.",
    accent: "US Neutral",
    tags: ["Warm", "Supportive"],
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/Alloy/48k/default.mp3",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Upbeat and energetic with a confident, friendly tone.",
    accent: "US Bright",
    tags: ["Energetic", "Friendly"],
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/Amber/48k/default.mp3",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Clear and modern — perfect for concise status updates.",
    accent: "UK Modern",
    tags: ["Clear", "Professional"],
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/Nova/48k/default.mp3",
  },
  {
    id: "sol",
    name: "Sol",
    description: "Bright and uplifting, with a friendly conversational feel.",
    accent: "US Casual",
    tags: ["Bright", "Conversational"],
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/Sol/48k/default.mp3",
  },
  {
    id: "luna",
    name: "Luna",
    description: "Soft-spoken and patient, offering gentle encouragement.",
    accent: "US Soothing",
    tags: ["Gentle", "Patient"],
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/Luna/48k/default.mp3",
  },
];

const VoiceSelectScreen = ({ navigation }) => {
  const { selectedVoice, setSelectedVoice, isLoading } = useVoice();
  const { role } = useAuth();
  const [activeVoiceId, setActiveVoiceId] = useState(
    selectedVoice?.id ?? VOICE_OPTIONS[0].id
  );
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    if (role !== "resident") {
      navigation.replace("RoleSelect");
    }
  }, [role, navigation]);

  useEffect(
    () => () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (selectedVoice?.id) {
      setActiveVoiceId(selectedVoice.id);
    }
  }, [selectedVoice]);

  const handlePreview = useCallback(
    async (voice) => {
      try {
        if (!voice.previewUrl) {
          Alert.alert(
            "Preview unavailable",
            "We couldn't load a preview for this voice yet."
          );
          return;
        }
        if (previewingVoiceId === voice.id && soundRef.current) {
          await soundRef.current.stopAsync();
          setPreviewingVoiceId(null);
          return;
        }
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPreviewingVoiceId(voice.id);
        const { sound } = await Audio.Sound.createAsync({
          uri: voice.previewUrl,
        });
        soundRef.current = sound;
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setPreviewingVoiceId(null);
            sound.unloadAsync().catch(() => undefined);
            soundRef.current = null;
          }
        });
      } catch (error) {
        console.warn("[VoiceSelect] Preview failed", error);
        setPreviewingVoiceId(null);
        Alert.alert(
          "Preview unavailable",
          "We couldn't play that preview. Please try again."
        );
      }
    },
    [previewingVoiceId]
  );

  const handleContinue = useCallback(async () => {
    const voice = VOICE_OPTIONS.find((option) => option.id === activeVoiceId);
    if (!voice) {
      Alert.alert("Select a voice", "Please pick the voice you want to use.");
      return;
    }
    await setSelectedVoice(voice);
    navigation.navigate("Login");
  }, [activeVoiceId, navigation, setSelectedVoice]);

  const handleSelectVoice = useCallback(
    (voice) => {
      setActiveVoiceId(voice.id);
      handlePreview(voice);
    },
    [handlePreview]
  );

  const renderVoiceCard = useCallback(
    ({ item }) => {
      const isActive = item.id === activeVoiceId;
      const isPreviewing = previewingVoiceId === item.id;
      return (
        <Pressable
          onPress={() => handleSelectVoice(item)}
          style={[
            styles.voiceCard,
            isActive && styles.voiceCardActive,
            isLoading && styles.voiceCardDisabled,
          ]}
          disabled={isLoading}
        >
          <LinearGradient
            colors={
              isActive
                ? ["rgba(129,140,248,0.32)", "rgba(59,130,246,0.24)"]
                : ["rgba(15,23,42,0.72)", "rgba(15,23,42,0.9)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.voiceHeader}>
            <Text style={styles.voiceTitle}>{item.name}</Text>
            <Text style={styles.voiceAccent}>{item.accent}</Text>
          </View>
          <Text style={styles.voiceDescription}>{item.description}</Text>
          <View style={styles.voiceTagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.voiceTag}>
                <Text style={styles.voiceTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={styles.voiceActions}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={() => handlePreview(item)}
            >
              <Text style={styles.previewButtonText}>
                {isPreviewing ? "Stop preview" : "Preview voice"}
              </Text>
            </TouchableOpacity>
            {isActive && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Selected</Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [activeVoiceId, handlePreview, handleSelectVoice, isLoading, previewingVoiceId]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>Tune your guide</Text>
        <Text style={styles.title}>Choose your voice</Text>
        <Text style={styles.subtitle}>
          Pick the assistant tone that fits you best. You can change this later
          in settings.
        </Text>
      </View>
    ),
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroOverlay}
      />
      <View style={styles.container}>
        <FlatList
          data={VOICE_OPTIONS}
          renderItem={renderVoiceCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isLoading && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#8b5cf6", "#6366f1", "#3b82f6"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.continueText}>
              Continue with{" "}
              {VOICE_OPTIONS.find((v) => v.id === activeVoiceId)?.name ??
                "this voice"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VoiceSelectScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  heroOverlay: {
    position: "absolute",
    top: -280,
    left: -160,
    right: -160,
    height: 560,
    opacity: 0.32,
  },
  listContent: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  backButtonText: {
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    maxWidth: 520,
  },
  voiceCard: {
    position: "relative",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    overflow: "hidden",
    ...shadows.card,
  },
  voiceCardActive: {
    borderColor: "rgba(99,102,241,0.55)",
    shadowColor: "rgba(99,102,241,0.55)",
    shadowOpacity: 0.55,
    shadowRadius: 22,
  },
  voiceCardDisabled: {
    opacity: 0.6,
  },
  voiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  voiceAccent: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  voiceDescription: {
    fontSize: 15,
    color: colors.surface,
    lineHeight: 22,
  },
  voiceTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  voiceTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(99,102,241,0.22)",
  },
  voiceTagText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: colors.text,
  },
  voiceActions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  previewButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.65)",
  },
  previewButtonText: {
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  activePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(99,102,241,0.35)",
  },
  activePillText: {
    color: colors.text,
    fontWeight: "700",
  },
  continueButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.card,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueText: {
    color: "#F8FAFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerAction: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
});


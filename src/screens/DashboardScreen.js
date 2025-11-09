import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, shadows } from "../theme/colors";
import { IssueCard } from "../components/IssueCard";
import { useAuth } from "../context/AuthContext";
import {
  updateIssueQueuePosition,
  updateIssueStatus,
  useIssues,
} from "../services/issueService";

const urgencyOrder = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"];
const CLOSED_HIDE_DELAY_MS = 7000;

const DashboardScreen = ({ navigation }) => {
  console.log("[Dashboard] Component mounted/rendered");
  const [filterUrgency, setFilterUrgency] = useState("ALL");
  const [nowTick, setNowTick] = useState(Date.now());
  const { logout, role } = useAuth();
  const issuesData = useIssues();
  console.log("[Dashboard] issuesData loaded, count:", issuesData.length);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const issuesForRole = useMemo(() => {
    if (role === "maintenance") {
      return issuesData.filter((issue) => issue.team === "maintenance");
    }
    if (role === "ra") {
      return issuesData.filter((issue) => issue.team === "ra");
    }
    return issuesData;
  }, [issuesData, role]);

  const { sortedIssues, filteredIssues } = useMemo(() => {
    const now = nowTick;
    const visibleIssues = issuesForRole.filter((issue) => {
      if (issue.status !== "closed") {
        return true;
      }
      if (!issue.closedAt) {
        return true;
      }
      const closedMs = new Date(issue.closedAt).getTime();
      if (Number.isNaN(closedMs)) {
        return true;
      }
      return now - closedMs < CLOSED_HIDE_DELAY_MS;
    });

    const getUrgencyIndex = (issue) => {
      const idx = urgencyOrder.indexOf(issue.urgency);
      return idx === -1 ? urgencyOrder.length : idx;
    };

    const getReportedAtMs = (issue) => {
      if (!issue.reportedAt) {
        return Number.MAX_SAFE_INTEGER;
      }
      const value = new Date(issue.reportedAt).getTime();
      return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
    };

    const sorted = [...visibleIssues].sort((a, b) => {
      const urgencyDiff = getUrgencyIndex(a) - getUrgencyIndex(b);
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }
      return getReportedAtMs(a) - getReportedAtMs(b);
    });

    const filteredList =
      filterUrgency === "ALL"
        ? sorted
        : sorted.filter((issue) => issue.urgency === filterUrgency);

    return { sortedIssues: sorted, filteredIssues: filteredList };
  }, [filterUrgency, issuesForRole, nowTick]);

  useEffect(() => {
    console.log("[Dashboard] sortedIssues changed, count:", sortedIssues.length);
    if (!sortedIssues.length) {
      console.log("[Dashboard] No issues to sync");
      return;
    }

    const syncPositions = async () => {
      const updates = [];
      console.log("[Dashboard] Checking queue positions for", sortedIssues.length, "issues");
      sortedIssues.forEach((issue, index) => {
        const expectedPosition = index + 1;
        console.log("[Dashboard] Issue queue check:", {
          id: issue.id.substring(0, 10),
          currentQueue: issue.queuePosition,
          expectedQueue: expectedPosition,
          match: issue.queuePosition === expectedPosition,
        });
        if (issue.queuePosition !== expectedPosition) {
          console.log("[Dashboard] Queue position mismatch - will update:", {
            id: issue.id,
            current: issue.queuePosition,
            expected: expectedPosition,
          });
          updates.push(
            updateIssueQueuePosition(issue.id, expectedPosition).catch(
              (error) => {
                console.warn(
                  "[Dashboard] Failed to sync queue position",
                  issue.id,
                  error
                );
              }
            )
          );
        }
      });
      if (updates.length) {
        console.log("[Dashboard] Syncing", updates.length, "queue positions");
        await Promise.all(updates);
        console.log("[Dashboard] Queue sync complete");
      } else {
        console.log("[Dashboard] All queue positions already in sync");
      }
    };

    syncPositions();
  }, [sortedIssues]);

  const handleLogout = useCallback(async () => {
    console.log("[Dashboard] Signing out user");
    await logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "RoleSelect" }],
      })
    );
  }, [logout, navigation]);

  const handleStatusChange = useCallback(async (issueId, nextStatus) => {
    try {
      await updateIssueStatus(issueId, nextStatus);
    } catch (error) {
      console.error("[Dashboard] Failed to update ticket status:", error);
      Alert.alert(
        "Update failed",
        "We couldn't update the ticket status. Please try again."
      );
    }
  }, []);

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
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Resi Command</Text>
            <Text style={styles.title}>
              {role === "maintenance"
                ? "Maintenance Operations"
                : role === "ra"
                ? "Resident Life Operations"
                : "Live Issue Queue"}
            </Text>
            <Text style={styles.subtitle}>
              Monitor the requests that matter most. Prioritized by urgency and
              freshness so your team can respond instantly.
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Open tickets</Text>
            <Text style={styles.metricValue}>
              {sortedIssues.filter((issue) => issue.status !== "closed").length}
            </Text>
            <Text style={styles.metricHint}>
              Updated {new Date(nowTick).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Queue focus</Text>
            <Text style={styles.metricValue}>
              {role === "maintenance"
                ? "Maintenance"
                : role === "ra"
                ? "Resident Life"
                : "All"}
            </Text>
            <Text style={styles.metricHint}>
              Showing tickets routed to your team
            </Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.filtersLabel}>Filter by urgency</Text>
          <View style={styles.filters}>
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => {
              const isActive = filterUrgency === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterUrgency(level)}
                >
                  <Text
                    style={[styles.filterText, isActive && styles.filterTextActive]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filteredIssues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderItem={({ item, index }) => (
            <IssueCard
              issue={item}
              position={index + 1}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroOverlay: {
    position: "absolute",
    top: -260,
    left: -180,
    right: -180,
    height: 520,
    opacity: 0.28,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
  },
  topBar: {
    position: "relative",
    borderRadius: 26,
    padding: 22,
    backgroundColor: "rgba(8, 12, 26, 0.85)",
    overflow: "hidden",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginTop: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(221,227,250,0.78)",
    marginTop: 10,
    maxWidth: 520,
    lineHeight: 22,
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.78)",
  },
  logoutText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(127,92,255,0.18)",
    ...shadows.card,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  metricValue: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  metricHint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
  },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(127,92,255,0.18)",
    ...shadows.card,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 0,
    backgroundColor: colors.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: "rgba(127,92,255,0.24)",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 72,
    paddingTop: 6,
  },
});

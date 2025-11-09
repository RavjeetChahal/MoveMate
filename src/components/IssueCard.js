import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, shadows } from "../theme/colors";

const urgencyColors = {
  HIGH: "#FF7A8A",
  MEDIUM: "#F6C762",
  LOW: "#43D9A3",
  UNKNOWN: "#64748B",
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

const formatTimestamp = (timestamp) => {
  if (!timestamp && timestamp !== 0) return null;

  const date =
    typeof timestamp === "number"
      ? new Date(timestamp)
      : new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toLocaleString();
  }
};

const teamLabel = (team, category) => {
  if (team === "maintenance") return "Maintenance";
  if (team === "ra") return "Resident Life";
  return category || "General";
};

export const IssueCard = ({ issue, position, onPress, onStatusChange }) => {
  const displayId = issue.displayId || issue.id;
  const statusValue = (issue.status || "open").toLowerCase();
  const urgency = issue.urgency || "UNKNOWN";
  const reportedAtLabel = formatTimestamp(issue.reportedAt);
  const showReported = Boolean(reportedAtLabel);
  const teamText = teamLabel(issue.team, issue.category);

  const metaItems = [
    { label: "Location", value: issue.location },
    { label: "Ticket", value: displayId },
    showReported && { label: "Reported", value: reportedAtLabel },
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress?.(issue)}
    >
      <LinearGradient
        colors={["rgba(30,41,59,0.92)", "rgba(15,23,42,0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.identifier}>
          <Text style={styles.positionLabel}>
            {typeof position === "number" ? `#${position}` : displayId}
          </Text>
          <View style={styles.teamPill}>
            <Text style={styles.teamText}>{teamText}</Text>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            { borderColor: `${urgencyColors[urgency] ?? colors.warning}40` },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: urgencyColors[urgency] ?? colors.warning },
            ]}
          >
            {urgency}
          </Text>
        </View>
      </View>

      <Text style={styles.summary} numberOfLines={2} ellipsizeMode="tail">
        {issue.summary}
      </Text>

      <Text style={styles.issueType} numberOfLines={1} ellipsizeMode="tail">
        {issue.issueType}
      </Text>

      <View style={styles.metaInlineRow}>
        {metaItems.map((item, idx) => (
          <View
            key={item.label}
            style={[
              styles.metaInlineItem,
              idx !== metaItems.length - 1 && styles.metaInlineDivider,
            ]}
          >
            <Text style={styles.metaInlineLabel}>{item.label}</Text>
            <Text
              style={styles.metaInlineValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.metaLabel}>Status</Text>
        <View style={styles.chipsRow}>
          {STATUS_OPTIONS.map((option) => {
            const isActive = statusValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusChip,
                  isActive && styles.statusChipActive,
                ]}
                onPress={() => {
                  if (!isActive) {
                    onStatusChange?.(option.value);
                  }
                }}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isActive && styles.statusChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(71,85,105,0.35)",
    overflow: "hidden",
    ...shadows.card,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  identifier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.4,
  },
  teamPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(59,196,246,0.14)",
  },
  teamText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    backgroundColor: "rgba(10, 15, 28, 0.55)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
  },
  issueType: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaInlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaInlineItem: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaInlineDivider: {
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(148, 163, 184, 0.35)",
  },
  metaInlineLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaInlineValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    maxWidth: 220,
  },
  statusSection: {
    gap: 8,
    marginTop: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: "rgba(127,92,255,0.24)",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  statusChipTextActive: {
    color: colors.primary,
  },
});

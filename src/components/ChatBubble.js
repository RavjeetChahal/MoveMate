import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const ChatBubble = ({ sender, text, isSpeaking }) => {
  const isResident = sender === "Resident";
  const outlineProgress = useRef(new Animated.Value(0)).current;
  const outlineIntensity = useRef(new Animated.Value(isSpeaking ? 1 : 0)).current;
  const outlineLoopRef = useRef(null);

  const residentGradient = useMemo(() => ["#5032E2", "#7F5CFF"], []);
  const geminiPalette = useMemo(
    () => [
      "rgba(59,130,246,0.85)", // blue
      "rgba(34,197,94,0.85)", // green
      "rgba(249,115,22,0.85)", // orange
      "rgba(236,72,153,0.85)", // pink
      "rgba(59,130,246,0.85)",
    ],
    []
  );

  useEffect(() => {
    if (isResident) {
      outlineLoopRef.current?.stop();
      outlineLoopRef.current = null;
      outlineProgress.stopAnimation(() => outlineProgress.setValue(0));
      return;
    }

    outlineProgress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(outlineProgress, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    outlineLoopRef.current = loop;
    loop.start();

    return () => {
      outlineLoopRef.current?.stop();
      outlineLoopRef.current = null;
      outlineProgress.stopAnimation(() => outlineProgress.setValue(0));
    };
  }, [isResident, outlineProgress]);

  useEffect(() => {
    if (isResident) return;
    Animated.timing(outlineIntensity, {
      toValue: isSpeaking ? 1 : 0,
      duration: isSpeaking ? 320 : 540,
      easing: isSpeaking ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isResident, isSpeaking, outlineIntensity]);

  const outlineScale = outlineIntensity.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const outlineOpacity = outlineIntensity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.85],
  });

  const sweepTranslate = outlineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 12],
  });

  const sweepRotate = outlineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.wrapper, isResident && styles.wrapperResident]}>
      <View
        style={[
          styles.bubbleShell,
          isResident ? styles.shellResident : styles.shellAssistant,
        ]}
      >
        {!isResident ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.gradientOutline,
              {
                opacity: outlineOpacity,
                transform: [{ scale: outlineScale }],
              },
            ]}
          >
            <AnimatedLinearGradient
              colors={geminiPalette}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { rotate: sweepRotate },
                    { translateX: sweepTranslate },
                  ],
                },
              ]}
            />
            <View style={styles.gradientOutlineMask} />
          </Animated.View>
        ) : null}
        <View
          style={[
            styles.container,
            isResident ? styles.residentContainer : styles.aiContainer,
          ]}
        >
          {isResident && (
            <LinearGradient
              colors={residentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Text style={[styles.sender, isResident && styles.senderResident]}>
            {sender}
          </Text>
          <Text style={[styles.text, isResident && styles.textResident]}>
            {text}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "flex-start",
  },
  wrapperResident: {
    alignItems: "flex-end",
  },
  bubbleShell: {
    position: "relative",
    marginBottom: 4,
    maxWidth: "82%",
  },
  shellAssistant: {
    alignSelf: "flex-start",
  },
  shellResident: {
    alignSelf: "flex-end",
  },
  container: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  aiContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(12,17,33,0.95)",
    borderWidth: 1,
    borderColor: "rgba(82,86,122,0.35)",
  },
  residentContainer: {
    alignSelf: "flex-end",
    backgroundColor: "transparent",
  },
  sender: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(223,230,255,0.75)",
    marginBottom: 4,
  },
  senderResident: {
    color: "rgba(235,241,255,0.88)",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#E9EDFF",
  },
  textResident: {
    color: "#FFFFFF",
  },
  gradientOutline: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 22,
    overflow: "hidden",
  },
  gradientOutlineMask: {
    position: "absolute",
    top: 1.75,
    bottom: 1.75,
    left: 1.75,
    right: 1.75,
    borderRadius: 20.5,
    backgroundColor: "rgba(12,18,34,0.98)",
  },
});


import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useShakeDetector } from "@/hooks/useShakeDetector";
import { useLocation } from "@/hooks/useLocation";
import {
  sendEmergencyAlert,
  getContacts,
  cancelAlert,
  EmergencyAlert,
} from "@/services/emergencyService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";

type AlertState = "idle" | "countdown" | "sending" | "sent" | "error";

export default function HomeScreen() {
  const { user } = useAuth();
  const { getCurrentLocation, hasPermission } = useLocation();
  const [alertState, setAlertState] = useState<AlertState>("idle");
  const [countdown, setCountdown] = useState(5);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const [liveAlertData, setLiveAlertData] = useState<EmergencyAlert | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userRef = useRef(user);
  const getLocationRef = useRef(getCurrentLocation);

  // Keep refs in sync
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { getLocationRef.current = getCurrentLocation; }, [getCurrentLocation]);

  // Real-time listener for current alert status (so user sees acknowledge/resolve live)
  useEffect(() => {
    if (!currentAlertId || alertState !== "sent") {
      setLiveAlertData(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "emergencyAlerts", currentAlertId),
      (snapshot) => {
        if (snapshot.exists()) {
          setLiveAlertData({ id: snapshot.id, ...snapshot.data() } as EmergencyAlert);
        }
      },
      (err) => {
        console.warn("Alert listener error:", err);
      }
    );

    return () => unsubscribe();
  }, [currentAlertId, alertState]);

  // Pulse animation for the shake button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alertPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alertState === "idle") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [alertState]);

  useEffect(() => {
    if (alertState === "sent") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(alertPulse, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(alertPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [alertState]);

  const triggerEmergency = useCallback(async () => {
    if (alertState !== "idle" || !user) return;

    Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    setAlertState("countdown");
    setCountdown(5);

    let count = 5;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        doSendAlert();
      }
    }, 1000);
  }, [alertState, user]);

  const doSendAlert = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setAlertState("sending");

    try {
      const loc = await getLocationRef.current();
      const contacts = await getContacts(currentUser.uid);
      const contactNames = contacts.map((c) => c.name);

      const alertId = await sendEmergencyAlert({
        userId: currentUser.uid,
        userEmail: currentUser.email || "unknown",
        latitude: loc?.latitude || 0,
        longitude: loc?.longitude || 0,
        accuracy: loc?.accuracy || null,
        status: "pending",
        contactsNotified: contactNames,
      });

      setCurrentAlertId(alertId);
      setAlertState("sent");
      Vibration.vibrate([0, 500]);
    } catch (err) {
      console.error(err);
      setAlertState("error");
      Alert.alert("Error", "Failed to send emergency alert. Please try again.");
    }
  };

  const handleCancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (currentAlertId) {
      cancelAlert(currentAlertId).catch(console.error);
    }
    setAlertState("idle");
    setCurrentAlertId(null);
    setLiveAlertData(null);
    setCountdown(5);
  };

  const handleManualTrigger = () => {
    if (alertState === "idle") {
      triggerEmergency();
    }
  };

  // Shake detection
  useShakeDetector(triggerEmergency, shakeEnabled && alertState === "idle");

  const renderFlowDiagram = () => (
    <View style={styles.flowContainer}>
      <Text style={styles.flowTitle}>How It Works</Text>

      {/* User node */}
      <View style={styles.flowRow}>
        <View style={[styles.flowNode, styles.flowNodeUser]}>
          <MaterialIcons name="person" size={22} color="#fff" />
          <Text style={styles.flowNodeText}>YOU</Text>
        </View>
      </View>

      {/* Arrow down with label */}
      <View style={styles.flowArrow}>
        <MaterialIcons name="vibration" size={16} color="#7BAF7B" />
        <Text style={styles.flowArrowLabel}>Shake Device</Text>
        <MaterialIcons name="arrow-downward" size={18} color="#7BAF7B" />
      </View>

      {/* Shake2Save node */}
      <View style={styles.flowRow}>
        <View style={[styles.flowNode, styles.flowNodeApp]}>
          <MaterialIcons name="security" size={22} color="#fff" />
          <Text style={styles.flowNodeText}>SHAKE2SAVE</Text>
        </View>
      </View>

      {/* Two arrows going out */}
      <View style={styles.flowSplit}>
        {/* Left: GPS */}
        <View style={styles.flowBranch}>
          <View style={styles.flowArrow}>
            <MaterialIcons name="my-location" size={14} color="#3498db" />
            <Text style={[styles.flowArrowLabel, { color: "#3498db" }]}>GPS Location</Text>
            <MaterialIcons name="arrow-downward" size={16} color="#3498db" />
          </View>
          <View style={[styles.flowNodeSmall, { backgroundColor: "#3498db" }]}>
            <MaterialIcons name="location-on" size={16} color="#fff" />
            <Text style={styles.flowNodeSmallText}>Location Tracked</Text>
          </View>
        </View>

        {/* Right: Alert */}
        <View style={styles.flowBranch}>
          <View style={styles.flowArrow}>
            <MaterialIcons name="notifications-active" size={14} color="#e74c3c" />
            <Text style={[styles.flowArrowLabel, { color: "#e74c3c" }]}>Emergency Alert</Text>
            <MaterialIcons name="arrow-downward" size={16} color="#e74c3c" />
          </View>
          <View style={[styles.flowNodeSmall, { backgroundColor: "#e74c3c" }]}>
            <MaterialIcons name="local-hospital" size={16} color="#fff" />
            <Text style={styles.flowNodeSmallText}>Response Team</Text>
          </View>
        </View>
      </View>

      {/* Merge arrows */}
      <View style={styles.flowArrow}>
        <MaterialIcons name="arrow-downward" size={18} color="#7BAF7B" />
      </View>

      {/* Response node */}
      <View style={styles.flowRow}>
        <View style={[styles.flowNode, styles.flowNodeResponse]}>
          <MaterialIcons name="check-circle" size={22} color="#fff" />
          <Text style={styles.flowNodeText}>HELP ARRIVES</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <MaterialIcons
            name={hasPermission ? "location-on" : "location-off"}
            size={18}
            color={hasPermission ? "#7BAF7B" : "#e74c3c"}
          />
          <Text style={[styles.statusText, { color: hasPermission ? "#7BAF7B" : "#e74c3c" }]}>
            GPS {hasPermission ? "Active" : "Disabled"}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons
            name={shakeEnabled ? "vibration" : "smartphone"}
            size={18}
            color={shakeEnabled ? "#7BAF7B" : "#999"}
          />
          <Text style={[styles.statusText, { color: shakeEnabled ? "#7BAF7B" : "#999" }]}>
            Shake {shakeEnabled ? "ON" : "OFF"}
          </Text>
        </View>
      </View>

      {/* Main action area */}
      {alertState === "idle" && (
        <View style={styles.mainArea}>
          <Text style={styles.instruction}>Shake your device to send an emergency alert</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.shakeButton} onPress={handleManualTrigger}>
              <MaterialIcons name="vibration" size={64} color="#fff" />
              <Text style={styles.shakeButtonText}>SHAKE</Text>
              <Text style={styles.shakeButtonSub}>or tap to activate</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShakeEnabled(!shakeEnabled)}
          >
            <MaterialIcons
              name={shakeEnabled ? "toggle-on" : "toggle-off"}
              size={32}
              color={shakeEnabled ? "#7BAF7B" : "#ccc"}
            />
            <Text style={styles.toggleText}>
              Shake Detection: {shakeEnabled ? "Enabled" : "Disabled"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {alertState === "countdown" && (
        <View style={styles.mainArea}>
          <View style={styles.countdownArea}>
            <MaterialIcons name="warning" size={48} color="#e67e22" />
            <Text style={styles.countdownTitle}>EMERGENCY ALERT</Text>
            <Text style={styles.countdownSubtitle}>Sending in...</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownHint}>Shake detected! Cancel if accidental.</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <MaterialIcons name="close" size={24} color="#fff" />
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {alertState === "sending" && (
        <View style={styles.mainArea}>
          <View style={styles.sendingArea}>
            <MaterialIcons name="sync" size={48} color="#3498db" />
            <Text style={styles.sendingText}>Sending Emergency Alert...</Text>
            <Text style={styles.sendingSubtext}>Getting your GPS location...</Text>
          </View>
        </View>
      )}

      {alertState === "sent" && (
        <View style={styles.mainArea}>
          <Animated.View
            style={[styles.sentArea, { transform: [{ scale: alertPulse }] }]}
          >
            {liveAlertData?.status === "resolved" ? (
              <>
                <MaterialIcons name="verified-user" size={64} color="#27ae60" />
                <Text style={styles.sentTitle}>EMERGENCY RESOLVED</Text>
                <Text style={styles.sentSubtext}>
                  {liveAlertData.responderNote || "Emergency has been resolved. Stay safe."}
                </Text>
              </>
            ) : liveAlertData?.status === "acknowledged" ? (
              <>
                <MaterialIcons name="local-hospital" size={64} color="#3498db" />
                <Text style={[styles.sentTitle, { color: "#3498db" }]}>HELP IS ON THE WAY!</Text>
                <Text style={styles.sentSubtext}>
                  {liveAlertData.responderNote || "A responder has acknowledged your alert."}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check-circle" size={64} color="#27ae60" />
                <Text style={styles.sentTitle}>ALERT SENT!</Text>
                <Text style={styles.sentSubtext}>
                  Emergency response team has been notified with your GPS location.
                </Text>
              </>
            )}
          </Animated.View>

          {/* Responder info card */}
          {liveAlertData?.responderName && (
            <View style={styles.responderCard}>
              <MaterialIcons name="assignment-ind" size={22} color="#3498db" />
              <View style={{ flex: 1 }}>
                <Text style={styles.responderCardTitle}>Responder Assigned</Text>
                <Text style={styles.responderCardName}>{liveAlertData.responderName}</Text>
              </View>
              <MaterialIcons name="check-circle" size={20} color="#27ae60" />
            </View>
          )}

          {/* Live flow indicator */}
          <View style={styles.liveFlow}>
            <View style={styles.liveFlowStep}>
              <View style={[styles.liveFlowDot, { backgroundColor: "#27ae60" }]} />
              <Text style={styles.liveFlowText}>Alert Created</Text>
              <MaterialIcons name="check" size={16} color="#27ae60" />
            </View>
            <View style={styles.liveFlowLine} />
            <View style={styles.liveFlowStep}>
              <View style={[styles.liveFlowDot, { backgroundColor: "#27ae60" }]} />
              <Text style={styles.liveFlowText}>GPS Location Sent</Text>
              <MaterialIcons name="check" size={16} color="#27ae60" />
            </View>
            <View style={styles.liveFlowLine} />
            <View style={styles.liveFlowStep}>
              <View style={[styles.liveFlowDot, {
                backgroundColor: liveAlertData?.status === "acknowledged" || liveAlertData?.status === "resolved"
                  ? "#27ae60" : "#e67e22"
              }]} />
              <Text style={styles.liveFlowText}>
                {liveAlertData?.status === "acknowledged" || liveAlertData?.status === "resolved"
                  ? "Responder Acknowledged" : "Awaiting Response Team..."}
              </Text>
              {liveAlertData?.status === "acknowledged" || liveAlertData?.status === "resolved" ? (
                <MaterialIcons name="check" size={16} color="#27ae60" />
              ) : (
                <MaterialIcons name="hourglass-top" size={16} color="#e67e22" />
              )}
            </View>
            {(liveAlertData?.status === "acknowledged" || liveAlertData?.status === "resolved") && (
              <>
                <View style={styles.liveFlowLine} />
                <View style={styles.liveFlowStep}>
                  <View style={[styles.liveFlowDot, {
                    backgroundColor: liveAlertData?.status === "resolved" ? "#27ae60" : "#e67e22"
                  }]} />
                  <Text style={styles.liveFlowText}>
                    {liveAlertData?.status === "resolved" ? "Emergency Resolved" : "Help is on the way..."}
                  </Text>
                  {liveAlertData?.status === "resolved" ? (
                    <MaterialIcons name="check" size={16} color="#27ae60" />
                  ) : (
                    <MaterialIcons name="local-hospital" size={16} color="#3498db" />
                  )}
                </View>
              </>
            )}
          </View>

          {liveAlertData?.status === "resolved" ? (
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: "#27ae60" }]}
              onPress={handleCancel}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Done — Back to Home</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <MaterialIcons name="close" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel Alert</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {alertState === "error" && (
        <View style={styles.mainArea}>
          <MaterialIcons name="error" size={64} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to send alert</Text>
          <TouchableOpacity
            style={[styles.shakeButton, { backgroundColor: "#e74c3c", width: 160, height: 160 }]}
            onPress={() => { setAlertState("idle"); }}
          >
            <MaterialIcons name="refresh" size={40} color="#fff" />
            <Text style={styles.shakeButtonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Flow diagram at bottom */}
      {alertState === "idle" && renderFlowDiagram()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  scrollContent: { paddingBottom: 30 },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 13, fontWeight: "600" },
  mainArea: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 20 },
  instruction: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  shakeButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#7BAF7B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#7BAF7B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  shakeButtonText: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },
  shakeButtonSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
  toggleText: { fontSize: 14, color: "#666" },

  // Countdown
  countdownArea: { alignItems: "center", gap: 8 },
  countdownTitle: { fontSize: 22, fontWeight: "800", color: "#e74c3c", marginTop: 8 },
  countdownSubtitle: { fontSize: 16, color: "#666" },
  countdownNumber: { fontSize: 72, fontWeight: "800", color: "#e74c3c" },
  countdownHint: { fontSize: 13, color: "#999", textAlign: "center" },

  // Sending
  sendingArea: { alignItems: "center", gap: 12 },
  sendingText: { fontSize: 18, fontWeight: "700", color: "#3498db" },
  sendingSubtext: { fontSize: 14, color: "#999" },

  // Sent
  sentArea: { alignItems: "center", gap: 8, marginBottom: 20 },
  sentTitle: { fontSize: 24, fontWeight: "800", color: "#27ae60" },
  sentSubtext: { fontSize: 14, color: "#666", textAlign: "center", maxWidth: 280 },

  // Responder card
  responderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#e8f4fd",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bee0f7",
  },
  responderCardTitle: { fontSize: 11, color: "#888", fontWeight: "600" },
  responderCardName: { fontSize: 16, fontWeight: "700", color: "#2980b9", marginTop: 2 },

  // Live flow
  liveFlow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
    elevation: 2,
  },
  liveFlowStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  liveFlowDot: { width: 10, height: 10, borderRadius: 5 },
  liveFlowText: { flex: 1, fontSize: 14, color: "#333" },
  liveFlowLine: { width: 2, height: 12, backgroundColor: "#ddd", marginLeft: 4 },

  // Cancel
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#e74c3c",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    elevation: 3,
  },
  cancelButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  errorText: { fontSize: 18, color: "#e74c3c", fontWeight: "700", marginVertical: 16 },

  // Flow diagram
  flowContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d5a2d",
    textAlign: "center",
    marginBottom: 16,
  },
  flowRow: { alignItems: "center" },
  flowNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 2,
  },
  flowNodeUser: { backgroundColor: "#7BAF7B" },
  flowNodeApp: { backgroundColor: "#5a9a5a" },
  flowNodeResponse: { backgroundColor: "#27ae60" },
  flowNodeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  flowArrow: { alignItems: "center", paddingVertical: 6, gap: 2 },
  flowArrowLabel: { fontSize: 11, color: "#7BAF7B", fontWeight: "600" },
  flowSplit: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 4,
  },
  flowBranch: { alignItems: "center", flex: 1 },
  flowNodeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flowNodeSmallText: { color: "#fff", fontSize: 10, fontWeight: "600" },
});

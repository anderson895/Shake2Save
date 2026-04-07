import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Vibration,
  AppState,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import {
  subscribeToPendingAlerts,
  acknowledgeAlert,
  resolveAlert,
  EmergencyAlert,
} from "@/services/emergencyService";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { router } from "expo-router";
import { generateAlarmWavUri } from "@/utils/alarmSound";

export default function ResponderDashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const prevAlertCountRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isFirstLoad = useRef(true);

  // Play alarm sound + vibration when new alerts arrive
  const playAlertSound = async () => {
    try {
      // Stop previous sound if still playing
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      // Configure audio to play even in silent mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      // Generate alarm WAV and play it
      const alarmUri = generateAlarmWavUri();
      const { sound } = await Audio.Sound.createAsync(
        { uri: alarmUri },
        { shouldPlay: true, volume: 1.0, isLooping: true }
      );
      soundRef.current = sound;
      setAlarmPlaying(true);

      // Auto-stop after 10 seconds
      setTimeout(async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
          setAlarmPlaying(false);
        } catch {}
      }, 10000);

      // Also vibrate
      Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500], false);
    } catch (err) {
      console.warn("Could not play alert sound:", err);
      // Fallback: vibrate only
      Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500], false);
    }
  };

  // Stop alarm manually
  const stopAlarm = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      Vibration.cancel();
      setAlarmPlaying(false);
    } catch {}
  };

  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((newAlerts) => {
      const pendingCount = newAlerts.filter((a) => a.status === "pending").length;

      if (!isFirstLoad.current && pendingCount > prevAlertCountRef.current) {
        // New alert arrived — play sound + vibrate
        playAlertSound();
      }

      prevAlertCountRef.current = pendingCount;
      isFirstLoad.current = false;
      setAlerts(newAlerts);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const handleAcknowledge = (alert: EmergencyAlert) => {
    Alert.alert(
      "Acknowledge Alert",
      `Acknowledge emergency from ${alert.userEmail}? This notifies the user that help is coming.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Acknowledge",
          onPress: async () => {
            try {
              await acknowledgeAlert(
                alert.id!,
                user?.uid || "",
                user?.displayName || user?.email || "Responder",
                "Help is on the way. Stay calm."
              );
              Alert.alert("Done", "Alert acknowledged. User has been notified.");
            } catch (err) {
              Alert.alert("Error", "Failed to acknowledge alert");
            }
          },
        },
      ]
    );
  };

  const handleResolve = (alert: EmergencyAlert) => {
    Alert.alert(
      "Resolve Alert",
      "Mark this emergency as resolved?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          onPress: async () => {
            try {
              await resolveAlert(
                alert.id!,
                user?.uid || "",
                user?.displayName || user?.email || "Responder",
                "Emergency has been resolved. Stay safe."
              );
            } catch (err) {
              Alert.alert("Error", "Failed to resolve alert");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const openInMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    const d = timestamp.toDate();
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const pendingAlerts = alerts.filter((a) => a.status === "pending");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");

  const renderAlert = ({ item }: { item: EmergencyAlert }) => {
    const isPending = item.status === "pending";
    return (
      <View style={[styles.alertCard, !isPending && styles.alertCardAcknowledged]}>
        {/* Header */}
        <View style={styles.alertHeader}>
          <View style={[styles.alertBadge, !isPending && styles.alertBadgeAck]}>
            <MaterialIcons
              name={isPending ? "warning" : "thumb-up"}
              size={18}
              color={isPending ? "#e74c3c" : "#3498db"}
            />
            <Text style={[styles.alertBadgeText, !isPending && { color: "#3498db" }]}>
              {isPending ? "EMERGENCY" : "ACKNOWLEDGED"}
            </Text>
          </View>
          <Text style={styles.alertTime}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* User info */}
        <View style={styles.alertUserRow}>
          <MaterialIcons name="person" size={18} color="#333" />
          <Text style={styles.alertUserText}>
            {item.userName || item.userEmail}
          </Text>
        </View>

        {/* Location */}
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={() => openInMaps(item.latitude, item.longitude)}
        >
          <MaterialIcons name="location-on" size={20} color="#fff" />
          <Text style={styles.locationBtnText}>
            Open Location in Maps ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})
          </Text>
          <MaterialIcons name="open-in-new" size={16} color="#fff" />
        </TouchableOpacity>

        {/* Contacts notified */}
        {item.contactsNotified?.length > 0 && (
          <View style={styles.contactsRow}>
            <MaterialIcons name="people" size={16} color="#666" />
            <Text style={styles.contactsText}>
              Contacts: {item.contactsNotified.join(", ")}
            </Text>
          </View>
        )}

        {/* Responder info if acknowledged */}
        {item.responderName && (
          <View style={styles.contactsRow}>
            <MaterialIcons name="assignment-ind" size={16} color="#3498db" />
            <Text style={[styles.contactsText, { color: "#3498db" }]}>
              Responder: {item.responderName}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {isPending && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.acknowledgeBtn]}
              onPress={() => handleAcknowledge(item)}
            >
              <MaterialIcons name="thumb-up" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.resolveBtn]}
            onPress={() => handleResolve(item)}
          >
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c0392b" />
        <Text style={styles.loadingText}>Connecting to alert system...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <View style={styles.statsBar}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingAlerts.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#3498db" }]}>
              {acknowledgedAlerts.length}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Responder info */}
      <View style={styles.responderBar}>
        <MaterialIcons name="assignment-ind" size={18} color="#c0392b" />
        <Text style={styles.responderName}>
          {user?.displayName || user?.email || "Responder"}
        </Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <MaterialIcons name="logout" size={18} color="#999" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Alarm banner */}
      {alarmPlaying && (
        <TouchableOpacity style={styles.alarmBanner} onPress={stopAlarm}>
          <MaterialIcons name="volume-off" size={20} color="#fff" />
          <Text style={styles.alarmBannerText}>ALARM ACTIVE — Tap to stop</Text>
        </TouchableOpacity>
      )}

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="verified-user" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Active Alerts</Text>
          <Text style={styles.emptySubtext}>
            All clear! Emergency alerts will appear here in real-time with an alarm sound.
          </Text>
          <View style={styles.liveIndicatorLarge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTextLarge}>Listening for emergencies...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdf2f2" },
  alarmBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
  },
  alarmBannerText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#999", fontSize: 14 },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statsRow: { flexDirection: "row", gap: 24 },
  statItem: {},
  statNumber: { fontSize: 28, fontWeight: "800", color: "#c0392b" },
  statLabel: { fontSize: 13, color: "#888" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fde8e8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e74c3c",
  },
  liveText: { color: "#e74c3c", fontWeight: "800", fontSize: 11 },
  responderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  responderName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#333" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6 },
  signOutText: { color: "#999", fontSize: 12 },
  list: { padding: 16, paddingBottom: 80 },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  alertCardAcknowledged: {
    borderLeftColor: "#3498db",
    shadowColor: "#3498db",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fde8e8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeAck: { backgroundColor: "#e8f0fd" },
  alertBadgeText: { color: "#e74c3c", fontWeight: "800", fontSize: 12 },
  alertTime: { fontSize: 12, color: "#999" },
  alertUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  alertUserText: { fontSize: 14, fontWeight: "600", color: "#333" },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3498db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  locationBtnText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  contactsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  contactsText: { fontSize: 13, color: "#666", flex: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  acknowledgeBtn: { backgroundColor: "#3498db" },
  resolveBtn: { backgroundColor: "#27ae60" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#999", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#bbb", textAlign: "center", marginTop: 8, lineHeight: 20 },
  liveIndicatorLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#fde8e8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  liveTextLarge: { color: "#e74c3c", fontWeight: "600", fontSize: 13 },
});

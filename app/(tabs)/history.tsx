import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getUserAlerts, EmergencyAlert } from "@/services/emergencyService";
import { useFocusEffect } from "@react-navigation/native";

const statusConfig: Record<string, { color: string; icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  pending: { color: "#e67e22", icon: "hourglass-top", label: "Pending" },
  acknowledged: { color: "#3498db", icon: "thumb-up", label: "Acknowledged" },
  resolved: { color: "#27ae60", icon: "check-circle", label: "Resolved" },
  cancelled: { color: "#999", icon: "cancel", label: "Cancelled" },
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      getUserAlerts(user.uid)
        .then(setAlerts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [user])
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    const d = timestamp.toDate();
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const openInMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  const renderAlert = ({ item }: { item: EmergencyAlert }) => {
    const config = statusConfig[item.status] || statusConfig.pending;
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={[styles.statusBadge, { backgroundColor: config.color + "20" }]}>
            <MaterialIcons name={config.icon as any} size={16} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.alertDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.alertBody}>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => openInMaps(item.latitude, item.longitude)}
          >
            <MaterialIcons name="location-on" size={18} color="#3498db" />
            <Text style={styles.locationText}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
            <MaterialIcons name="open-in-new" size={14} color="#3498db" />
          </TouchableOpacity>

          {item.contactsNotified?.length > 0 && (
            <View style={styles.infoRow}>
              <MaterialIcons name="people" size={16} color="#666" />
              <Text style={styles.infoText}>
                Notified: {item.contactsNotified.join(", ")}
              </Text>
            </View>
          )}

          {item.responderNote && (
            <View style={styles.infoRow}>
              <MaterialIcons name="message" size={16} color="#666" />
              <Text style={styles.infoText}>{item.responderNote}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7BAF7B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Alert History</Text>
          <Text style={styles.emptySubtext}>
            Your emergency alerts will appear here.
          </Text>
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
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  alertDate: { fontSize: 12, color: "#999" },
  alertBody: { gap: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 13, color: "#3498db", flex: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: "#666", flex: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#999", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#bbb", textAlign: "center", marginTop: 8 },
});

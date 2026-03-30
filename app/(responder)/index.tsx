import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getAllPendingAlerts,
  acknowledgeAlert,
  resolveAlert,
  EmergencyAlert,
} from "@/services/emergencyService";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

export default function ResponderDashboard() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAllPendingAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadAlerts, 10000);
      return () => clearInterval(interval);
    }, [loadAlerts])
  );

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
              await acknowledgeAlert(alert.id!, "Help is on the way. Stay calm.");
              loadAlerts();
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
              await resolveAlert(alert.id!, "Emergency has been resolved. Stay safe.");
              loadAlerts();
            } catch (err) {
              Alert.alert("Error", "Failed to resolve alert");
            }
          },
        },
      ]
    );
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

  const renderAlert = ({ item }: { item: EmergencyAlert }) => (
    <View style={styles.alertCard}>
      {/* Header */}
      <View style={styles.alertHeader}>
        <View style={styles.alertBadge}>
          <MaterialIcons name="warning" size={18} color="#e74c3c" />
          <Text style={styles.alertBadgeText}>EMERGENCY</Text>
        </View>
        <Text style={styles.alertTime}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* User info */}
      <View style={styles.alertUserRow}>
        <MaterialIcons name="person" size={18} color="#333" />
        <Text style={styles.alertUserText}>{item.userEmail}</Text>
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

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acknowledgeBtn]}
          onPress={() => handleAcknowledge(item)}
        >
          <MaterialIcons name="thumb-up" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Acknowledge</Text>
        </TouchableOpacity>

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c0392b" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Pending Alerts</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadAlerts}>
          <MaterialIcons name="refresh" size={24} color="#c0392b" />
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="verified-user" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Pending Alerts</Text>
          <Text style={styles.emptySubtext}>
            All clear! Pending emergency alerts will appear here in real-time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadAlerts();
            }} />
          }
        />
      )}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <MaterialIcons name="arrow-back" size={20} color="#666" />
        <Text style={styles.backBtnText}>Back to App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdf2f2" },
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
  statItem: {},
  statNumber: { fontSize: 28, fontWeight: "800", color: "#c0392b" },
  statLabel: { fontSize: 13, color: "#888" },
  refreshBtn: { padding: 8 },
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
  contactsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  contactsText: { fontSize: 13, color: "#666", flex: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  backBtnText: { fontSize: 14, color: "#666" },
});

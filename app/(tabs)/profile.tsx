import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user } = useAuth();

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User info card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || "User"}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Info section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Shake2Save</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="vibration" size={22} color="#7BAF7B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Shake Detection</Text>
              <Text style={styles.infoDesc}>
                Shake your phone to instantly send an emergency alert with your GPS location.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={22} color="#3498db" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>GPS Tracking</Text>
              <Text style={styles.infoDesc}>
                Your real-time location is shared with emergency responders to find you fast.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="contacts" size={22} color="#e67e22" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Emergency Contacts</Text>
              <Text style={styles.infoDesc}>
                Manage your trusted contacts who get notified during emergencies.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="local-hospital" size={22} color="#e74c3c" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Response Team</Text>
              <Text style={styles.infoDesc}>
                Emergency responders receive your alerts in real-time with alarm notifications.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={20} color="#e74c3c" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Shake2Save v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7BAF7B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "700" },
  userName: { fontSize: 20, fontWeight: "700", color: "#333" },
  userEmail: { fontSize: 14, color: "#999", marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2d5a2d", marginBottom: 10 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  infoDesc: { fontSize: 13, color: "#888", marginTop: 2, lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 4 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 20,
  },
  signOutText: { fontSize: 16, color: "#e74c3c", fontWeight: "600" },
  version: { textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 16 },
});

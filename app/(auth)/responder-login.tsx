import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { createUserProfile } from "@/services/emergencyService";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function ResponderLoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Simple team code for responder verification
  const RESPONDER_CODE = "RESCUE2024";

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "responder") {
        Alert.alert("Access Denied", "This account is not registered as an emergency responder. Please use the regular login.");
        await auth.signOut();
        setLoading(false);
        return;
      }
      router.replace("/(responder)");
    } catch (error: any) {
      let msg = "Login failed";
      if (error.code === "auth/user-not-found") msg = "No account found with this email";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address";
      else if (error.code === "auth/invalid-credential") msg = "Invalid email or password";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (teamCode.trim().toUpperCase() !== RESPONDER_CODE) {
      Alert.alert("Invalid Code", "The team access code is incorrect. Please contact your administrator.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await createUserProfile(cred.user.uid, {
        email: email.trim(),
        displayName: name.trim(),
        role: "responder",
      });
      router.replace("/(responder)");
    } catch (error: any) {
      let msg = "Registration failed";
      if (error.code === "auth/email-already-in-use") msg = "This email is already registered";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address";
      else if (error.code === "auth/weak-password") msg = "Password is too weak";
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="local-hospital" size={48} color="#fff" />
          </View>
          <Text style={styles.title}>RESPONSE TEAM</Text>
          <Text style={styles.subtitle}>Emergency Response Portal</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, !isRegister && styles.toggleBtnActive]}
            onPress={() => setIsRegister(false)}
          >
            <Text style={[styles.toggleText, !isRegister && styles.toggleTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, isRegister && styles.toggleBtnActive]}
            onPress={() => setIsRegister(true)}
          >
            <Text style={[styles.toggleText, isRegister && styles.toggleTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {isRegister && (
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color="#c0392b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#c0392b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#c0392b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {isRegister && (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock-outline" size={20} color="#c0392b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="vpn-key" size={20} color="#c0392b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Team Access Code"
                  placeholderTextColor="#999"
                  value={teamCode}
                  onChangeText={setTeamCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.codeHint}>
                <MaterialIcons name="info-outline" size={14} color="#999" />
                <Text style={styles.codeHintText}>
                  Ask your team administrator for the access code
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegister ? "Create Responder Account" : "Sign In as Responder"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2c1010" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30, paddingVertical: 40 },
  backBtn: { position: "absolute", top: 0, left: 0, padding: 4 },
  header: { alignItems: "center", marginBottom: 30 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#c0392b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 2 },
  subtitle: { fontSize: 14, color: "#e88", marginTop: 4 },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#3d1a1a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#c0392b" },
  toggleText: { color: "#999", fontWeight: "600", fontSize: 14 },
  toggleTextActive: { color: "#fff" },
  form: { gap: 14 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3d1a1a",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: "#5a2a2a",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#fff" },
  button: {
    backgroundColor: "#c0392b",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  codeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  codeHintText: { color: "#999", fontSize: 12 },
});

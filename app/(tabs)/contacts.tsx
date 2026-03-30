import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  EmergencyContact,
} from "@/services/emergencyService";
import { useFocusEffect } from "@react-navigation/native";

export default function ContactsScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getContacts(user.uid);
      setContacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const openAddModal = () => {
    setEditingContact(null);
    setName("");
    setPhone("");
    setRelationship("");
    setModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Error", "Name and phone are required");
      return;
    }
    if (!user) return;

    try {
      if (editingContact?.id) {
        await updateContact(editingContact.id, {
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim(),
        });
      } else {
        await addContact({
          userId: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim(),
        });
      }
      setModalVisible(false);
      loadContacts();
    } catch (err) {
      Alert.alert("Error", "Failed to save contact");
    }
  };

  const handleDelete = (contact: EmergencyContact) => {
    Alert.alert(
      "Delete Contact",
      `Remove ${contact.name} from emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (contact.id) {
              await deleteContact(contact.id);
              loadContacts();
            }
          },
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        {item.relationship ? (
          <Text style={styles.contactRelation}>{item.relationship}</Text>
        ) : null}
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
          <MaterialIcons name="edit" size={20} color="#7BAF7B" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
          <MaterialIcons name="delete" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7BAF7B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="person-add" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
          <Text style={styles.emptySubtext}>
            Add contacts who will be notified when you trigger an emergency alert.
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id || item.phone}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <MaterialIcons name="person-add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? "Edit Contact" : "Add Emergency Contact"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Juan Dela Cruz"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.modalInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g., 09171234567"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.modalInput}
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g., Mother, Friend, Spouse"
                placeholderTextColor="#bbb"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingContact ? "Update Contact" : "Add Contact"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 80 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7BAF7B",
    justifyContent: "center",
    alignItems: "center",
  },
  contactInitial: { color: "#fff", fontSize: 20, fontWeight: "700" },
  contactInfo: { flex: 1, marginLeft: 12 },
  contactName: { fontSize: 16, fontWeight: "700", color: "#333" },
  contactPhone: { fontSize: 14, color: "#666", marginTop: 2 },
  contactRelation: { fontSize: 12, color: "#999", marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#999", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#bbb", textAlign: "center", marginTop: 8, lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7BAF7B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#7BAF7B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  modalForm: { padding: 20, gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginTop: 8 },
  modalInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  saveBtn: {
    backgroundColor: "#7BAF7B",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

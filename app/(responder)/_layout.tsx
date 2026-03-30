import { Stack } from "expo-router";

export default function ResponderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#c0392b" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Emergency Response Team" }}
      />
    </Stack>
  );
}

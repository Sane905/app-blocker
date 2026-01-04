import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

const extractHostParam = (url: string | null) => {
  if (!url) {
    return null;
  }
  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return null;
  }
  const query = url.slice(queryStart + 1);
  const pairs = query.split("&");
  for (const pair of pairs) {
    const [rawKey, rawValue = ""] = pair.split("=");
    if (decodeURIComponent(rawKey) === "host") {
      return decodeURIComponent(rawValue);
    }
  }
  return null;
};

export default function App() {
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      setLastUrl(url);
      setHost(extractHostParam(url));
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => handleUrl(null));

    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App opened</Text>
      <Text style={styles.subtitle}>
        {host ? `Host: ${host}` : "Host: (none)"}
      </Text>
      <Text style={styles.url}>{lastUrl ?? "No deep link yet."}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  url: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },
});

import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

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
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const rewardedRef = useRef<RewardedAd | null>(null);

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

  useEffect(() => {
    mobileAds()
      .initialize()
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const rewarded = RewardedAd.createForAdRequest(TestIds.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewardedRef.current = rewarded;
    setAdLoaded(false);
    setAdError(null);

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setAdLoaded(true);
        setAdError(null);
      }
    );
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        Alert.alert("解除成功", `Reward: ${reward.amount} ${reward.type}`);
      }
    );
    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setAdLoaded(false);
        rewarded.load();
      }
    );
    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        setAdLoaded(false);
        setAdError(error?.message ?? "Failed to load ad.");
      }
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const handleShowRewarded = () => {
    const rewarded = rewardedRef.current;
    if (!rewarded) {
      return;
    }
    if (adLoaded) {
      rewarded.show();
    } else {
      rewarded.load();
    }
  };

  const handleSkip = () => {
    Linking.openURL("https://example.com").catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App opened</Text>
      <Text style={styles.subtitle}>
        {host ? `Host: ${host}` : "Host: (none)"}
      </Text>
      <Text style={styles.url}>{lastUrl ?? "No deep link yet."}</Text>
      {adError ? <Text style={styles.error}>{adError}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          onPress={handleShowRewarded}
          style={({ pressed }) => [
            styles.button,
            !adLoaded && styles.buttonDisabled,
            pressed && adLoaded && styles.buttonPressed,
          ]}
          disabled={!adLoaded}
        >
          <Text style={styles.buttonText}>
            {adLoaded ? "広告を見て解除" : "広告を準備中..."}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>今回は見ない</Text>
        </Pressable>
      </View>
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
    marginBottom: 16,
  },
  error: {
    color: "#b00020",
    marginBottom: 12,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#fff7ee",
    borderWidth: 1,
    borderColor: "#d9d2c8",
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

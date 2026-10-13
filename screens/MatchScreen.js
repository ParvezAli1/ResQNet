import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { matchHelperToSurvivor, triageSOS, getSurvivalTips } from '../ai';

export default function MatchScreen({ navigation, helpers = [], survivors = [] }) {
  const [userLocation, setUserLocation] = useState(null);
  const [sortedHelpers, setSortedHelpers] = useState([]);
  const [aiMatches, setAiMatches] = useState({});
  const [aiTriage, setAiTriage] = useState({});
  const [aiTips, setAiTips] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('helpers');

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (userLocation && helpers.length > 0) {
      const sorted = [...helpers]
        .map((helper) => ({
          ...helper,
          distance: getDistance(
            userLocation.latitude,
            userLocation.longitude,
            helper.latitude,
            helper.longitude
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      setSortedHelpers(sorted);
    }
  }, [userLocation, helpers]);

  useEffect(() => {
    if (survivors.length > 0) {
      runAITriage();
    }
  }, [survivors]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is needed to find nearby helpers.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setUserLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const runAITriage = async () => {
    setLoadingAI(true);
    try {
      const result = await triageSOS(survivors);
      if (result) {
        const triageMap = {};
        result.forEach((item) => {
          triageMap[item.senderId] = item.urgency;
        });
        setAiTriage(triageMap);
      }
    } catch (error) {
      console.error('AI triage failed:', error);
    }
    setLoadingAI(false);
  };

  const runAIMatch = async (survivor) => {
    if (sortedHelpers.length === 0) {
      Alert.alert('No Helpers', 'No helpers available to match.');
      return;
    }
    setLoadingAI(true);
    try {
      const result = await matchHelperToSurvivor(survivor, sortedHelpers);
      if (result) {
        setAiMatches((prev) => ({
          ...prev,
          [survivor.senderId]: result,
        }));
      }
    } catch (error) {
      console.error('AI match failed:', error);
    }
    setLoadingAI(false);
  };

  const fetchSurvivalTips = async (situation) => {
    setLoadingAI(true);
    const tips = await getSurvivalTips(situation);
    setAiTips(tips);
    setLoadingAI(false);
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg) => deg * (Math.PI / 180);

  const formatDistance = (km) => {
    if (km === Infinity) return 'Unknown';
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return '';
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return { bg: '#dc2626', text: '#fff' };
      case 'HIGH': return { bg: '#ea580c', text: '#fff' };
      case 'MEDIUM': return { bg: '#ca8a04', text: '#fff' };
      case 'LOW': return { bg: '#16a34a', text: '#fff' };
      default: return { bg: '#555', text: '#fff' };
    }
  };

  const renderSurvivor = ({ item }) => {
    const urgency = aiTriage[item.senderId] || 'UNKNOWN';
    const urgencyStyle = getUrgencyStyle(urgency);
    const match = aiMatches[item.senderId];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyStyle.bg }]}>
            <Text style={[styles.urgencyText, { color: urgencyStyle.text }]}>
              {urgency}
            </Text>
          </View>
          <Text style={styles.cardTime}>{getTimeSince(item.timestamp)}</Text>
        </View>

        <Text style={styles.cardName}>{item.name || 'Unknown Survivor'}</Text>
        <Text style={styles.cardMessage}>"{item.message}"</Text>
        <Text style={styles.coords}>
          📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
        </Text>

        {match ? (
          <View style={styles.matchResult}>
            <Text style={styles.matchTitle}>🤖 AI Match Found</Text>
            <Text style={styles.matchHelper}>Best helper: {match.helperId}</Text>
            <Text style={styles.matchReason}>{match.reason}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.matchBtn}
            onPress={() => runAIMatch(item)}
            disabled={loadingAI}
          >
            {loadingAI ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.matchBtnText}>🤖 Find Best Helper (AI)</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHelper = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name || '🤝 Helper'}</Text>
          <Text style={styles.cardDistance}>{formatDistance(item.distance)}</Text>
        </View>
        <Text style={styles.cardTime}>{getTimeSince(item.timestamp)}</Text>
      </View>

      <View style={styles.skillsRow}>
        {(item.skills || 'General help').split(',').map((skill, i) => (
          <View key={i} style={styles.skillChip}>
            <Text style={styles.skillChipText}>{skill.trim()}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.coords}>
        📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
      </Text>
    </View>
  );

  const renderEmptyHelpers = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📡</Text>
      <Text style={styles.emptyTitle}>Scanning for helpers...</Text>
      <Text style={styles.emptyDesc}>
        No helpers found yet. They will appear here sorted by distance.
      </Text>
    </View>
  );

  const renderEmptySurvivors = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📡</Text>
      <Text style={styles.emptyTitle}>No SOS signals yet</Text>
      <Text style={styles.emptyDesc}>
        SOS signals from nearby survivors will appear here with AI-powered triage.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🤖 AI Match Center</Text>
        <Text style={styles.subtitle}>
          Claude AI triages SOS signals & matches helpers
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'survivors' && styles.tabActive]}
          onPress={() => setActiveTab('survivors')}
        >
          <Text style={[styles.tabText, activeTab === 'survivors' && styles.tabTextActive]}>
            🆘 SOS Signals ({survivors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'helpers' && styles.tabActive]}
          onPress={() => setActiveTab('helpers')}
        >
          <Text style={[styles.tabText, activeTab === 'helpers' && styles.tabTextActive]}>
            🤝 Helpers ({sortedHelpers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loadingAI && (
        <View style={styles.aiBar}>
          <ActivityIndicator color="#4ade80" size="small" />
          <Text style={styles.aiBarText}>🤖 Claude AI is thinking...</Text>
        </View>
      )}

      {aiTips && (
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>🤖 AI Survival Tips</Text>
          <Text style={styles.tipsText}>{aiTips}</Text>
          <TouchableOpacity onPress={() => setAiTips(null)}>
            <Text style={styles.tipsDismiss}>Dismiss ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'survivors' ? (
        <FlatList
          data={survivors}
          keyExtractor={(item) => item.senderId || Math.random().toString()}
          renderItem={renderSurvivor}
          ListEmptyComponent={renderEmptySurvivors}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={sortedHelpers}
          keyExtractor={(item) => item.senderId || Math.random().toString()}
          renderItem={renderHelper}
          ListEmptyComponent={renderEmptyHelpers}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.triageBtn}
          onPress={runAITriage}
          disabled={loadingAI || survivors.length === 0}
        >
          <Text style={styles.triageBtnText}>🤖 Re-run AI Triage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tipsBtn}
          onPress={() => fetchSurvivalTips('earthquake with flooding and building collapse')}
          disabled={loadingAI}
        >
          <Text style={styles.tipsBtnText}>💡 Get Survival Tips</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#4ade80', fontSize: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 4 },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: '#16213e', borderRadius: 12,
    padding: 4, marginBottom: 12,
  },
  tab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#4ade80' },
  tabText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#1a1a2e' },

  aiBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#16213e', marginHorizontal: 20,
    borderRadius: 10, padding: 10, marginBottom: 12, gap: 8,
  },
  aiBarText: { color: '#4ade80', fontSize: 13 },

  tipsCard: {
    backgroundColor: '#1e3a5f', marginHorizontal: 20,
    borderRadius: 12, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#4ade80',
  },
  tipsTitle: { color: '#4ade80', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  tipsText: { color: '#ccc', fontSize: 13, lineHeight: 20 },
  tipsDismiss: { color: '#888', fontSize: 12, marginTop: 10, textAlign: 'right' },

  list: { paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: '#16213e', borderRadius: 16,
    padding: 18, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  cardMessage: { color: '#ccc', fontSize: 13, marginTop: 6, fontStyle: 'italic', lineHeight: 18 },
  cardDistance: { color: '#4ade80', fontSize: 13, marginTop: 2 },
  cardTime: { color: '#555', fontSize: 11 },
  cardInfo: { flex: 1, marginLeft: 12 },
  coords: { color: '#555', fontSize: 11, marginTop: 8 },

  urgencyBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10,
  },
  urgencyText: { fontSize: 11, fontWeight: 'bold' },

  rankBadge: {
    backgroundColor: '#1a1a2e', width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  rankText: { color: '#4ade80', fontWeight: 'bold', fontSize: 14 },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  skillChip: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  skillChipText: { color: '#888', fontSize: 11 },

  matchResult: {
    backgroundColor: '#1a3a2e', borderRadius: 10,
    padding: 12, marginTop: 12,
    borderLeftWidth: 3, borderLeftColor: '#4ade80',
  },
  matchTitle: { color: '#4ade80', fontSize: 13, fontWeight: 'bold' },
  matchHelper: { color: '#fff', fontSize: 13, marginTop: 4 },
  matchReason: { color: '#888', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  matchBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    padding: 12, marginTop: 12, alignItems: 'center',
  },
  matchBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptyDesc: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },

  footer: {
    flexDirection: 'row', paddingHorizontal: 20,
    paddingBottom: 24, paddingTop: 8, gap: 10,
  },
  triageBtn: {
    flex: 1, backgroundColor: '#dc2626', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  triageBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  tipsBtn: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  tipsBtnText: { color: '#4ade80', fontSize: 13, fontWeight: 'bold' },
});
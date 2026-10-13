import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView
} from 'react-native';

export default function HomeScreen({ navigation, peers }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌐 ResQNet</Text>
        <Text style={styles.subtitle}>AI Disaster Response</Text>
        <View style={styles.peersBadge}>
          <Text style={styles.peersText}>
            {peers > 0 ? `${peers} people nearby` : 'Scanning...'}
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.sosBtn]}
          onPress={() => navigation.navigate('Status', { mode: 'sos' })}
        >
          <Text style={styles.btnIcon}>🆘</Text>
          <Text style={styles.btnText}>I NEED HELP</Text>
          <Text style={styles.btnSub}>Send SOS to neighbors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.helpBtn]}
          onPress={() => navigation.navigate('Status', { mode: 'helper' })}
        >
          <Text style={styles.btnIcon}>🤝</Text>
          <Text style={styles.btnText}>I CAN HELP</Text>
          <Text style={styles.btnSub}>Offer help to survivors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.mapBtn]}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.btnIcon}>🗺️</Text>
          <Text style={styles.btnText}>LIVE MAP</Text>
          <Text style={styles.btnSub}>See survivors & resources</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.matchBtn]}
          onPress={() => navigation.navigate('Match')}
        >
          <Text style={styles.btnIcon}>🤖</Text>
          <Text style={styles.btnText}>AI MATCH</Text>
          <Text style={styles.btnSub}>AI-powered helper matching</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#888', marginTop: 4 },
  peersBadge: {
    marginTop: 16, backgroundColor: '#16213e',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  peersText: { color: '#4ade80', fontSize: 14 },
  buttons: { flex: 1, paddingHorizontal: 24, gap: 12 },
  btn: {
    borderRadius: 16, padding: 20,
    alignItems: 'center', elevation: 4,
  },
  sosBtn: { backgroundColor: '#dc2626' },
  helpBtn: { backgroundColor: '#16a34a' },
  mapBtn: { backgroundColor: '#2563eb' },
  matchBtn: { backgroundColor: '#7c3aed' },
  btnIcon: { fontSize: 32 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  btnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
});
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { mesh, MSG_TYPES } from '../mesh';

export default function StatusScreen({ navigation, route }) {
  const { mode } = route.params || { mode: 'sos' };
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is needed to share your position.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const sendSOS = async () => {
    if (!location) {
      Alert.alert('Waiting', 'Still getting your location. Please wait...');
      return;
    }
    setSending(true);
    try {
      await mesh.broadcast({
        type: MSG_TYPES.SOS,
        message: message || 'I need help!',
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });
      setSent(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to send SOS. Retrying...');
    }
    setSending(false);
  };

  const sendHelper = async () => {
    if (!location) {
      Alert.alert('Waiting', 'Still getting your location. Please wait...');
      return;
    }
    setSending(true);
    try {
      await mesh.broadcast({
        type: MSG_TYPES.HELPER,
        skills: skills || 'General help',
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });
      setSent(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to broadcast. Retrying...');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sentContainer}>
          <Text style={styles.sentIcon}>
            {mode === 'sos' ? '📡' : '✅'}
          </Text>
          <Text style={styles.sentTitle}>
            {mode === 'sos' ? 'SOS Sent!' : "You're on the map!"}
          </Text>
          <Text style={styles.sentDesc}>
            {mode === 'sos'
              ? 'Your distress signal is being relayed to nearby people through the mesh network.'
              : 'Nearby survivors can now see you as an available helper.'}
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📍 Your Location</Text>
            <Text style={styles.infoText}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Unknown'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.mapBtnText}>🗺️ View Live Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'sos') {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.icon}>🆘</Text>
          <Text style={styles.title}>Send SOS Signal</Text>
          <Text style={styles.desc}>
            Your distress signal will be broadcast to all nearby devices through the mesh network.
          </Text>

          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>📍 Your Location</Text>
            <Text style={styles.locationValue}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : '📡 Getting location...'}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Describe your situation (optional)"
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.sendBtn, styles.sosSendBtn]}
            onPress={sendSOS}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.sendBtnIcon}>📡</Text>
                <Text style={styles.sendBtnText}>BROADCAST SOS</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>⚡ Works without internet using mesh networking</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon}>🤝</Text>
        <Text style={styles.title}>Offer Help</Text>
        <Text style={styles.desc}>
          Let nearby survivors know you're available to help. Your location will be shared on the mesh network.
        </Text>

        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>📍 Your Location</Text>
          <Text style={styles.locationValue}>
            {location
              ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
              : '📡 Getting location...'}
          </Text>
        </View>

        <Text style={styles.skillsLabel}>What can you help with?</Text>
        <View style={styles.skillTags}>
          {['First Aid', 'Food & Water', 'Shelter', 'Transport', 'Communication'].map((skill) => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.skillTag,
                skills.includes(skill) && styles.skillTagActive,
              ]}
              onPress={() => {
                setSkills((prev) =>
                  prev.includes(skill)
                    ? prev.replace(skill + ', ', '').replace(skill, '')
                    : prev ? prev + ', ' + skill : skill
                );
              }}
            >
              <Text
                style={[
                  styles.skillTagText,
                  skills.includes(skill) && styles.skillTagTextActive,
                ]}
              >
                {skill}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Additional info (optional)"
          placeholderTextColor="#666"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.sendBtn, styles.helperSendBtn]}
          onPress={sendHelper}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.sendBtnIcon}>📡</Text>
              <Text style={styles.sendBtnText}>BROADCAST AVAILABILITY</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>⚡ Works without internet using mesh networking</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  back: { paddingHorizontal: 20, paddingTop: 16 },
  backText: { color: '#4ade80', fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, alignItems: 'center' },

  icon: { fontSize: 60 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 16 },
  desc: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  locationCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16,
    width: '100%', marginTop: 24, alignItems: 'center',
  },
  locationLabel: { color: '#888', fontSize: 12 },
  locationValue: { color: '#4ade80', fontSize: 14, marginTop: 4 },

  input: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 14, width: '100%', marginTop: 16,
    textAlignVertical: 'top', minHeight: 80,
  },

  sendBtn: {
    borderRadius: 16, padding: 20, width: '100%',
    alignItems: 'center', marginTop: 24, elevation: 4,
  },
  sosSendBtn: { backgroundColor: '#dc2626' },
  helperSendBtn: { backgroundColor: '#16a34a' },
  sendBtnIcon: { fontSize: 24 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  note: { color: '#555', fontSize: 12, marginTop: 16 },

  skillsLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 20, alignSelf: 'flex-start' },
  skillTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, width: '100%' },
  skillTag: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#16213e',
    borderWidth: 1, borderColor: '#333',
  },
  skillTagActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  skillTagText: { color: '#888', fontSize: 13 },
  skillTagTextActive: { color: '#fff', fontWeight: 'bold' },

  sentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  sentIcon: { fontSize: 80 },
  sentTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  sentDesc: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  infoCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16,
    width: '100%', marginTop: 24, alignItems: 'center',
  },
  infoTitle: { color: '#888', fontSize: 12 },
  infoText: { color: '#4ade80', fontSize: 14, marginTop: 4 },
  mapBtn: {
    backgroundColor: '#2563eb', borderRadius: 16, padding: 18,
    width: '100%', alignItems: 'center', marginTop: 24,
  },
  mapBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  homeBtn: { marginTop: 16, padding: 12 },
  homeBtnText: { color: '#4ade80', fontSize: 14 },
});
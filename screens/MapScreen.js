import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Dimensions, Alert
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation, survivors = [], helpers = [], resources = [] }) {
  const [location, setLocation] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to show the map.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const getFilteredMarkers = () => {
    let markers = [];

    if (filter === 'all' || filter === 'sos') {
      survivors.forEach((s, i) => {
        if (s.latitude && s.longitude) {
          markers.push({
            id: `sos-${s.senderId || i}`,
            coordinate: { latitude: s.latitude, longitude: s.longitude },
            title: '🆘 SOS',
            description: s.message || 'Someone needs help!',
            type: 'sos',
          });
        }
      });
    }

    if (filter === 'all' || filter === 'helpers') {
      helpers.forEach((h, i) => {
        if (h.latitude && h.longitude) {
          markers.push({
            id: `helper-${h.senderId || i}`,
            coordinate: { latitude: h.latitude, longitude: h.longitude },
            title: '🤝 Helper',
            description: h.skills || 'Ready to help!',
            type: 'helper',
          });
        }
      });
    }

    if (filter === 'all' || filter === 'resources') {
      resources.forEach((r, i) => {
        if (r.latitude && r.longitude) {
          markers.push({
            id: `resource-${r.senderId || i}`,
            coordinate: { latitude: r.latitude, longitude: r.longitude },
            title: '📦 Resource',
            description: r.resourceType || 'Supplies available',
            type: 'resource',
          });
        }
      });
    }

    return markers;
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case 'sos': return '#dc2626';
      case 'helper': return '#16a34a';
      case 'resource': return '#2563eb';
      default: return '#888';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🗺️ Live Map</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>🆘 {survivors.length}</Text>
          <Text style={styles.stat}>🤝 {helpers.length}</Text>
          <Text style={styles.stat}>📦 {resources.length}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {['all', 'sos', 'helpers', 'resources'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' && '🌐 All'}
              {f === 'sos' && '🆘 SOS'}
              {f === 'helpers' && '🤝 Helpers'}
              {f === 'resources' && '📦 Resources'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={location}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {getFilteredMarkers().map((marker) => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinate}
                pinColor={getMarkerColor(marker.type)}
              >
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{marker.title}</Text>
                    <Text style={styles.calloutDesc}>{marker.description}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>📡 Getting your location...</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#dc2626' }]} />
          <Text style={styles.legendText}>SOS</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.legendText}>Helper</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.legendText}>Resource</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
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
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { color: '#ccc', fontSize: 14 },

  filters: {
    flexDirection: 'row', paddingHorizontal: 20,
    gap: 8, marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#16213e',
  },
  filterActive: { backgroundColor: '#4ade80' },
  filterText: { color: '#ccc', fontSize: 12 },
  filterTextActive: { color: '#1a1a2e', fontWeight: 'bold' },

  mapContainer: { flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  loading: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#16213e',
  },
  loadingText: { color: '#4ade80', fontSize: 16 },

  callout: { padding: 8, maxWidth: 200 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutDesc: { fontSize: 12, color: '#555' },

  legend: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 20, paddingVertical: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#ccc', fontSize: 12 },
});
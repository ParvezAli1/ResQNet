import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './screens/HomeScreen';
import StatusScreen from './screens/StatusScreen';
import MapScreen from './screens/MapScreen';
import MatchScreen from './screens/MatchScreen';

const Stack = createStackNavigator();

const USE_DEMO = false; // true = fake data, false = real Firebase

export default function App() {
  const [peers, setPeers] = useState(0);
  const [survivors, setSurvivors] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    if (USE_DEMO) {
      loadDemoData();
    } else {
      startNetwork();
    }
  }, []);

  const loadDemoData = () => {
    const { DEMO_SURVIVORS, DEMO_HELPERS, DEMO_RESOURCES } = require('./demoData');

    setTimeout(() => {
      setSurvivors([DEMO_SURVIVORS[0]]);
      setPeers(1);
    }, 1000);

    setTimeout(() => {
      setHelpers([DEMO_HELPERS[0]]);
      setPeers(2);
    }, 2000);

    setTimeout(() => {
      setSurvivors(DEMO_SURVIVORS);
      setHelpers(DEMO_HELPERS);
      setResources(DEMO_RESOURCES);
      setPeers(DEMO_SURVIVORS.length + DEMO_HELPERS.length);
    }, 3500);
  };

  const startNetwork = async () => {
    const { mesh, MSG_TYPES } = require('./mesh');
    await mesh.start();

    mesh.onMessageReceived = (data) => {
      if (data.type === MSG_TYPES.SOS) {
        setSurvivors(prev => {
          const exists = prev.find(s => s.senderId === data.senderId);
          if (exists) return prev;
          setPeers(p => p + 1);
          return [...prev, data];
        });
      }
      if (data.type === MSG_TYPES.HELPER) {
        setHelpers(prev => {
          const exists = prev.find(h => h.senderId === data.senderId);
          if (exists) return prev;
          setPeers(p => p + 1);
          return [...prev, data];
        });
      }
      if (data.type === MSG_TYPES.RESOURCE) {
        setResources(prev => [...prev, data]);
      }
    };
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {props => <HomeScreen {...props} peers={peers} />}
        </Stack.Screen>
        <Stack.Screen
          name="Status"
          component={StatusScreen}
        />
        <Stack.Screen name="Map">
          {props => (
            <MapScreen
              {...props}
              survivors={survivors}
              helpers={helpers}
              resources={resources}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Match">
          {props => (
            <MatchScreen
              {...props}
              helpers={helpers}
              survivors={survivors}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
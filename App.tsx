import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import TodoScreen from './screens/TodoScreen';
import MediaScreen from './screens/MediaScreen';
import GameScreen from './screens/GameScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 22 }}>
    {label === '待办' ? '📝' : label === '媒体' ? '🖼️' : '🎮'}
  </Text>
);

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#6C63FF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#eee',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        })}>
        <Tab.Screen name="待办" component={TodoScreen} />
        <Tab.Screen name="媒体" component={MediaScreen} />
        <Tab.Screen name="游戏" component={GameScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

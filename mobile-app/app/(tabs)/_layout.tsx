import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

function TabIcon({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.iconContainer, active && styles.iconActive]}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        sceneStyle: {
          backgroundColor: Colors.background,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          ...Typography.small,
          fontWeight: '600',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.tabDot,
                focused && { backgroundColor: Colors.cyan },
              ]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarLabel: 'Music',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.tabDot,
                focused && { backgroundColor: Colors.purple },
              ]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="aura"
        options={{
          title: 'AURA',
          tabBarLabel: 'AURA',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.tabDot,
                focused && { backgroundColor: Colors.pink },
              ]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.tabDot,
                focused && { backgroundColor: Colors.textMuted },
              ]}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {},
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted + '60',
    marginTop: 2,
  },
});

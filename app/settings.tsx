import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Shield, 
  Star,
  Mail,
  Share2,
  ChevronRight,
  Moon,
  Sun,
  CloudRain
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  viewMode: 'day' | 'night' | 'rain';
}

const APP_VERSION = '1.0.0';
const APP_NAME = 'Penalty Shootout \'85';
const DEVELOPER_EMAIL = 'info@oldskoolapps.com';
const APP_STORE_URL = '';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const stadiumSectionRef = useRef<View>(null);
  const difficultySectionRef = useRef<View>(null);
  const [stadiumSectionY, setStadiumSectionY] = useState(0);
  const [difficultySectionY, setDifficultySectionY] = useState(0);
  const [settings, setSettings] = useState<Settings>({
    soundEnabled: true,
    vibrationEnabled: true,
    difficulty: 'medium',
    viewMode: 'day',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (section && scrollViewRef.current) {
      setTimeout(() => {
        if (section === 'stadium' && stadiumSectionY > 0) {
          scrollViewRef.current?.scrollTo({ y: stadiumSectionY - 20, animated: true });
        } else if (section === 'difficulty' && difficultySectionY > 0) {
          scrollViewRef.current?.scrollTo({ y: difficultySectionY - 20, animated: true });
        }
      }, 100);
    }
  }, [section, stadiumSectionY, difficultySectionY]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('gameSettings');
      if (savedSettings && typeof savedSettings === 'string' && savedSettings.trim()) {
        try {
          // Validate JSON string more thoroughly
          const trimmed = savedSettings.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.length > 2) {
            // Additional validation - check for basic JSON structure
            if (trimmed.includes('"') || trimmed.includes("'")) {
              const parsedSettings = JSON.parse(trimmed);
              // Validate the parsed settings structure
              if (parsedSettings && typeof parsedSettings === 'object' && !Array.isArray(parsedSettings)) {
                setSettings({
                  soundEnabled: parsedSettings.soundEnabled ?? true,
                  vibrationEnabled: parsedSettings.vibrationEnabled ?? true,
                  difficulty: ['easy', 'medium', 'hard'].includes(parsedSettings.difficulty) ? parsedSettings.difficulty : 'medium',
                  viewMode: ['day', 'night', 'rain'].includes(parsedSettings.viewMode) ? parsedSettings.viewMode : 'day',
                });
                console.log('Settings loaded successfully:', parsedSettings);
              } else {
                console.log('Invalid settings object structure');
                await AsyncStorage.removeItem('gameSettings');
              }
            } else {
              console.log('Invalid JSON content, missing quotes');
              await AsyncStorage.removeItem('gameSettings');
            }
          } else {
            console.log('Invalid JSON format, cleared storage');
            await AsyncStorage.removeItem('gameSettings');
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          await AsyncStorage.removeItem('gameSettings');
          console.log('Cleared corrupted settings from storage');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Clear storage on any error
      try {
        await AsyncStorage.removeItem('gameSettings');
      } catch (clearError) {
        console.error('Failed to clear corrupted settings:', clearError);
      }
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('gameSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleSoundToggle = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    saveSettings(newSettings);
  };

  const handleVibrationToggle = () => {
    const newSettings = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    saveSettings(newSettings);
  };

  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard') => {
    const newSettings = { ...settings, difficulty };
    saveSettings(newSettings);
  };

  const handleViewModeChange = (viewMode: 'day' | 'night' | 'rain') => {
    const newSettings = { ...settings, viewMode };
    saveSettings(newSettings);
  };

  const handleRateApp = () => {
    if (APP_STORE_URL) {
      Linking.openURL(APP_STORE_URL).catch(() => {
        Alert.alert('Error', 'Unable to open App Store');
      });
    } else {
      Alert.alert('Coming Soon', 'Rate us once the app is published on the App Store!');
    }
  };

  const handleShareApp = () => {
    Alert.alert(
      'Share App',
      'Share Penalty Shootout \'85 with your friends!',
      [{ text: 'OK' }]
    );
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`${APP_NAME} Support`);
    const body = encodeURIComponent(`\n\n---\nApp Version: ${APP_VERSION}\n`);
    Linking.openURL(`mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  const handlePrivacyPolicy = () => {
    router.push('/privacy');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a5f3f', '#2d8659', '#4CAF50']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GAME SETTINGS</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              {settings.soundEnabled ? (
                <Volume2 size={24} color="#FFE66D" />
              ) : (
                <VolumeX size={24} color="#FFE66D" />
              )}
              <Text style={styles.settingLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.soundEnabled ? '#FFE66D' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Vibrate size={24} color="#FFE66D" />
              <Text style={styles.settingLabel}>Vibration</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={handleVibrationToggle}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.vibrationEnabled ? '#FFE66D' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Difficulty */}
        <View 
          style={styles.section}
          ref={difficultySectionRef}
          onLayout={(event) => {
            difficultySectionRef.current?.measureLayout(
              scrollViewRef.current as any,
              (x, y) => {
                setDifficultySectionY(y);
              },
              () => {}
            );
          }}
        >
          <Text style={styles.sectionTitle}>DIFFICULTY</Text>
          
          <View style={styles.difficultyContainer}>
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  settings.difficulty === level && styles.difficultyButtonActive
                ]}
                onPress={() => handleDifficultyChange(level)}
              >
                <Text style={[
                  styles.difficultyText,
                  settings.difficulty === level && styles.difficultyTextActive
                ]}>
                  {level.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.difficultyDescription}>
            {settings.difficulty === 'easy' && 'Goalkeeper saves less often'}
            {settings.difficulty === 'medium' && 'Balanced gameplay'}
            {settings.difficulty === 'hard' && 'Goalkeeper is more skilled'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GOALKEEPER - inspired by</Text>
          
          <View style={styles.keeperInfoContainer}>
            <View style={styles.keeperInfoRow}>
              <Text style={styles.keeperLabel}>Name:</Text>
              <Text style={styles.keeperValue}>Ubaldo Fillol</Text>
            </View>
            <View style={styles.keeperInfoRow}>
              <Text style={styles.keeperLabel}>Country:</Text>
              <Text style={styles.keeperValue}>Argentina</Text>
            </View>
            <View style={styles.keeperInfoRow}>
              <Text style={styles.keeperLabel}>Tournament:</Text>
              <Text style={styles.keeperValue}>1978 World Cup</Text>
            </View>
          </View>
          
          <Text style={styles.keeperDescription}>
            Argentina's star goalkeeper who made crucial saves throughout the tournament, leading his team to historic victory.
          </Text>
          
          <Text style={styles.keeperNote}>
            We think the keeper loosely resembles Ubaldo
          </Text>
        </View>

        {/* View Mode */}
        <View 
          style={styles.section}
          ref={stadiumSectionRef}
          onLayout={(event) => {
            stadiumSectionRef.current?.measureLayout(
              scrollViewRef.current as any,
              (x, y) => {
                setStadiumSectionY(y);
              },
              () => {}
            );
          }}
        >
          <Text style={styles.sectionTitle}>STADIUM VIEW</Text>
          
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                settings.viewMode === 'day' && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange('day')}
            >
              <Sun size={20} color={settings.viewMode === 'day' ? '#1a5f3f' : '#FFE66D'} />
              <Text style={[
                styles.viewModeText,
                settings.viewMode === 'day' && styles.viewModeTextActive
              ]}>
                DAY
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeButton,
                settings.viewMode === 'night' && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange('night')}
            >
              <Moon size={20} color={settings.viewMode === 'night' ? '#1a5f3f' : '#FFE66D'} />
              <Text style={[
                styles.viewModeText,
                settings.viewMode === 'night' && styles.viewModeTextActive
              ]}>
                NIGHT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeButton,
                settings.viewMode === 'rain' && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange('rain')}
            >
              <CloudRain size={20} color={settings.viewMode === 'rain' ? '#1a5f3f' : '#FFE66D'} />
              <Text style={[
                styles.viewModeText,
                settings.viewMode === 'rain' && styles.viewModeTextActive
              ]}>
                RAIN
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.viewModeDescription}>
            {settings.viewMode === 'day' && 'Bright sunny stadium atmosphere'}
            {settings.viewMode === 'night' && 'Evening match under floodlights'}
            {settings.viewMode === 'rain' && 'Challenging weather conditions'}
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <TouchableOpacity style={styles.aboutRow} onPress={handleRateApp}>
            <View style={styles.aboutLeft}>
              <Star size={24} color="#FFE66D" />
              <Text style={styles.aboutLabel}>Rate App</Text>
            </View>
            <ChevronRight size={20} color="#FFE66D" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow} onPress={handleShareApp}>
            <View style={styles.aboutLeft}>
              <Share2 size={24} color="#FFE66D" />
              <Text style={styles.aboutLabel}>Share App</Text>
            </View>
            <ChevronRight size={20} color="#FFE66D" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow} onPress={handleContactSupport}>
            <View style={styles.aboutLeft}>
              <Mail size={24} color="#FFE66D" />
              <Text style={styles.aboutLabel}>Contact Support</Text>
            </View>
            <ChevronRight size={20} color="#FFE66D" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow} onPress={handlePrivacyPolicy}>
            <View style={styles.aboutLeft}>
              <Shield size={24} color="#FFE66D" />
              <Text style={styles.aboutLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#FFE66D" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
          <Text style={styles.copyright}>© 2025 Old Skool Apps LLC</Text>
          <Text style={styles.madeWith}>Made with love for football fans</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5f3f',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE66D',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFE66D',
    letterSpacing: 2,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 109, 0.2)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFE66D',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#FFE66D',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFE66D',
  },
  difficultyTextActive: {
    color: '#1a5f3f',
  },
  difficultyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 109, 0.2)',
  },
  aboutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFE66D',
    letterSpacing: 1,
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 5,
  },
  madeWith: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFE66D',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#FFE66D',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFE66D',
  },
  viewModeTextActive: {
    color: '#1a5f3f',
  },
  viewModeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  keeperInfoContainer: {
    gap: 12,
    marginBottom: 15,
  },
  keeperInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 109, 0.2)',
  },
  keeperLabel: {
    fontSize: 16,
    color: '#FFE66D',
    fontWeight: '600',
  },
  keeperValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  keeperDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  keeperNote: {
    fontSize: 13,
    color: 'rgba(255, 230, 109, 0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
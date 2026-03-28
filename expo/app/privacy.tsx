import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_POLICY_DATE = 'January 1, 2025';
const APP_NAME = 'Penalty Shootout \'85';
const COMPANY_NAME = 'Old Skool Apps LLC';
const CONTACT_EMAIL = 'info@oldskoolapps.com';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a5f3f', '#2d8659', '#4CAF50']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.date}>Last Updated: {PRIVACY_POLICY_DATE}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to {APP_NAME}. This Privacy Policy explains how {COMPANY_NAME} 
              ("we", "us", or "our") collects, uses, and protects your information when 
              you use our mobile application.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.paragraph}>
              {APP_NAME} is designed with your privacy in mind. We collect minimal information:
            </Text>
            <Text style={styles.bulletPoint}>
              • Game Settings: Your preferences (sound, vibration, difficulty) are stored 
              locally on your device
            </Text>
            <Text style={styles.bulletPoint}>
              • Game Statistics: High scores and achievements are stored locally
            </Text>
            <Text style={styles.bulletPoint}>
              • No personal information is collected or transmitted to our servers
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Information</Text>
            <Text style={styles.paragraph}>
              All data is stored locally on your device and is used solely to:
            </Text>
            <Text style={styles.bulletPoint}>
              • Save your game preferences
            </Text>
            <Text style={styles.bulletPoint}>
              • Track your game progress
            </Text>
            <Text style={styles.bulletPoint}>
              • Enhance your gaming experience
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
            <Text style={styles.paragraph}>
              All game data is stored locally on your device using secure storage methods 
              provided by the operating system. We do not have access to this data, and it 
              remains under your control.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
            <Text style={styles.paragraph}>
              {APP_NAME} does not integrate with any third-party analytics, advertising, 
              or tracking services. Your gaming experience is completely private.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              {APP_NAME} is suitable for all ages. We do not knowingly collect personal 
              information from children under 13. The app does not require any personal 
              information to play.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Data Deletion</Text>
            <Text style={styles.paragraph}>
              You can delete all game data at any time by uninstalling the app from your 
              device. This will remove all locally stored preferences and game progress.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. Any changes will be 
              reflected in the app with an updated "Last Updated" date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>
              Email: {CONTACT_EMAIL}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Your Rights</Text>
            <Text style={styles.paragraph}>
              Since all data is stored locally on your device, you have complete control 
              over your information. You can:
            </Text>
            <Text style={styles.bulletPoint}>
              • Access your data through the app settings
            </Text>
            <Text style={styles.bulletPoint}>
              • Modify your preferences at any time
            </Text>
            <Text style={styles.bulletPoint}>
              • Delete all data by uninstalling the app
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using {APP_NAME}, you agree to this Privacy Policy.
            </Text>
            <Text style={styles.footerText}>
              Thank you for playing!
            </Text>
          </View>

          <View style={styles.devSection}>
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qds5q55mgbcf8r8y59gx3' }}
              style={styles.devImage}
              resizeMode="cover"
            />
            <Text style={styles.devCaption}>Our dev, circa the 80s</Text>
          </View>
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
  content: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFE66D',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFE66D',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFE66D',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
    marginLeft: 10,
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 10,
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 230, 109, 0.3)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 5,
  },
  devSection: {
    marginTop: 30,
    alignItems: 'center',
  },
  devImage: {
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFE66D',
    marginBottom: 10,
  },
  devCaption: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { FeedingPhase } from '../types';

interface FeedingButtonProps {
  isFeeding: boolean;
  onPress: () => void;
  currentPhase?: FeedingPhase;
  onBreak?: boolean;
  onSwitch?: () => void;
}

const BUTTON_SIZE = Dimensions.get('window').width * 0.55;
const SWIPE_THRESHOLD = 60;

// Breast phase colors
const FIRST_COLOR = '#2A9D8F'; // teal
const SECOND_COLOR = '#9B5DE5'; // soft purple

export default function FeedingButton({
  isFeeding,
  onPress,
  currentPhase = 'first',
  onBreak = false,
  onSwitch,
}: FeedingButtonProps) {
  const { colors } = useTheme();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const panX = useRef(new Animated.Value(0)).current;

  // Keep latest props in refs so PanResponder always sees current values
  const isFeedingRef = useRef(isFeeding);
  const onSwitchRef = useRef(onSwitch);
  isFeedingRef.current = isFeeding;
  onSwitchRef.current = onSwitch;

  const doFlip = () => {
    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dy) < 40,
      onPanResponderMove: Animated.event([null, { dx: panX }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > SWIPE_THRESHOLD && onSwitchRef.current && isFeedingRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          doFlip();
          onSwitchRef.current();
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const getButtonColor = () => {
    if (!isFeeding) return colors.primary;
    return currentPhase === 'first' ? FIRST_COLOR : SECOND_COLOR;
  };

  const getEmoji = () => {
    if (!isFeeding) return '👶';
    return '🤱';
  };

  const getLabel = () => {
    if (!isFeeding) return 'TAP TO START';
    return 'TAP TO STOP';
  };

  const getBreastLabel = () => {
    if (!isFeeding) return null;
    return currentPhase === 'first' ? 'LEFT BREAST' : 'RIGHT BREAST';
  };

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const breastLabel = getBreastLabel();
  const buttonColor = getButtonColor();

  return (
    <Animated.View
      {...(isFeeding ? panResponder.panHandlers : {})}
      style={{
        transform: [
          { translateX: panX },
          { perspective: 1000 },
          { rotateY: flipInterpolate },
        ],
      }}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: BUTTON_SIZE / 2,
            backgroundColor: buttonColor,
            shadowColor: buttonColor,
          },
        ]}
      >
        <Text style={styles.emoji}>{getEmoji()}</Text>
        {breastLabel && (
          <Text style={styles.breastLabel}>{breastLabel}</Text>
        )}
        <Text style={[styles.label, { color: '#FFFFFF' }]}>
          {getLabel()}
        </Text>
        {isFeeding && (
          <Text style={styles.swipeHint}>⟵ swipe to switch ⟶</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 4,
  },
  breastLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 4,
    opacity: 0.9,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  swipeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 1,
  },
});

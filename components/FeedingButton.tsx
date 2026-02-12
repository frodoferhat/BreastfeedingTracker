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
import { FeedingPhase, FeedingMode } from '../types';

interface FeedingButtonProps {
  isFeeding: boolean;
  onPress: () => void;
  currentPhase?: FeedingPhase;
  onBreak?: boolean;
  onSwitch?: () => void;
  feedingMode?: FeedingMode;
  onModeToggle?: () => void;
}

const BUTTON_SIZE = Dimensions.get('window').width * 0.55;
const SWIPE_THRESHOLD = 60;

// Breast phase colors
const FIRST_COLOR = '#2A9D8F'; // teal
const SECOND_COLOR = '#9B5DE5'; // soft purple
const BOTTLE_COLOR = '#E67E22'; // warm orange

export default function FeedingButton({
  isFeeding,
  onPress,
  currentPhase = 'first',
  onBreak = false,
  onSwitch,
  feedingMode = 'breast',
  onModeToggle,
}: FeedingButtonProps) {
  const { colors } = useTheme();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const panX = useRef(new Animated.Value(0)).current;

  // Keep latest props in refs so PanResponder always sees current values
  const isFeedingRef = useRef(isFeeding);
  const onSwitchRef = useRef(onSwitch);
  const onModeToggleRef = useRef(onModeToggle);
  isFeedingRef.current = isFeeding;
  onSwitchRef.current = onSwitch;
  onModeToggleRef.current = onModeToggle;

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
        if (Math.abs(g.dx) > SWIPE_THRESHOLD) {
          if (isFeedingRef.current) {
            // While feeding in breast mode → switch breast
            if (onSwitchRef.current) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              doFlip();
              onSwitchRef.current();
            }
          } else {
            // While idle → toggle between breast/bottle mode
            if (onModeToggleRef.current) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              doFlip();
              onModeToggleRef.current();
            }
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const getButtonColor = () => {
    if (!isFeeding) {
      return feedingMode === 'bottle' ? BOTTLE_COLOR : colors.primary;
    }
    if (feedingMode === 'bottle') return BOTTLE_COLOR;
    return currentPhase === 'first' ? FIRST_COLOR : SECOND_COLOR;
  };

  const getEmoji = () => {
    if (feedingMode === 'bottle') return '🍼';
    if (!isFeeding) return '👶';
    return '🤱';
  };

  const getLabel = () => {
    if (!isFeeding) return 'TAP TO START';
    return 'TAP TO STOP';
  };

  const getModeLabel = () => {
    if (!isFeeding) {
      return feedingMode === 'bottle' ? 'BOTTLE' : 'BREAST';
    }
    if (feedingMode === 'bottle') return 'BOTTLE';
    return currentPhase === 'first' ? 'LEFT BREAST' : 'RIGHT BREAST';
  };

  const getSwipeHint = () => {
    if (!isFeeding) {
      return feedingMode === 'bottle'
        ? '⟵ swipe for 🤱 ⟶'
        : '⟵ swipe for 🍼 ⟶';
    }
    if (feedingMode === 'breast') {
      return '⟵ swipe to switch ⟶';
    }
    return null;
  };

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const buttonColor = getButtonColor();
  const swipeHint = getSwipeHint();
  // Enable swipe always except during bottle feeding
  const enableSwipe = !(isFeeding && feedingMode === 'bottle');

  return (
    <Animated.View
      {...(enableSwipe ? panResponder.panHandlers : {})}
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
        <Text style={styles.breastLabel}>{getModeLabel()}</Text>
        <Text style={[styles.label, { color: '#FFFFFF' }]}>
          {getLabel()}
        </Text>
        {swipeHint && (
          <Text style={styles.swipeHint}>{swipeHint}</Text>
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

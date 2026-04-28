import React from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, View } from 'react-native';
import { colors, scale } from '../../theme';

const SmartiflyPreloaderScreen: React.FC = () => {
  const logoPulse = React.useRef(new Animated.Value(0)).current;
  const loaderSweep = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const sweepLoop = Animated.loop(
      Animated.timing(loaderSweep, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    sweepLoop.start();

    return () => {
      pulseLoop.stop();
      sweepLoop.stop();
      loaderSweep.setValue(0);
    };
  }, [loaderSweep, logoPulse]);

  const logoAnimatedStyle = {
    opacity: logoPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        scale: logoPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.04],
        }),
      },
    ],
  };

  const loaderAnimatedStyle = {
    transform: [
      {
        translateX: loaderSweep.interpolate({
          inputRange: [0, 1],
          outputRange: [scale(-88), scale(176)],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <Image
            source={require('../../assets/smartifly_icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderSweep, loaderAnimatedStyle]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  logoWrap: {
    marginBottom: scale(44),
  },
  logo: {
    width: scale(450),
    height: scale(128),
    tintColor: colors.primary || '#E50914',
  },
  loaderTrack: {
    width: scale(280),
    height: scale(5),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  loaderSweep: {
    width: scale(88),
    height: '100%',
    borderRadius: scale(2),
    backgroundColor: colors.primary || '#E50914',
  },
});

export default SmartiflyPreloaderScreen;

import { useEffect, useRef } from 'react';
import LoginScreen from '../features/onboarding/LoginScreen';
import RegistrationScreen from '../features/onboarding/RegistrationScreen';
import WelcomeScreen from '../features/onboarding/WelcomeScreen';
import ProfileSelectionScreen from '../features/profiles/ProfileSelectionScreen';
import AppShell from '../features/shell/AppShell';
import StartupLoaderScreen from '../features/startup/StartupLoaderScreen';
import { useAppStore } from '../store/appStore';

function Router() {
  const session = useAppStore((state) => state.session);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const profileSelectionSource = useAppStore((state) => state.profileSelectionSource);
  const bootstrapStatus = useAppStore((state) => state.bootstrapStatus);
  const homeBootstrapData = useAppStore((state) => state.homeBootstrapData);
  const bootstrapHomeDataAction = useAppStore((state) => state.bootstrapHomeData);
  const refreshHomeBootstrapDataAction = useAppStore((state) => state.refreshHomeBootstrapData);
  const onboardingScreen = useAppStore((state) => state.onboardingScreen);
  const setOnboardingScreen = useAppStore((state) => state.setOnboardingScreen);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const backgroundRefreshKeyRef = useRef('');

  useEffect(() => {
    if (!session || !selectedProfile || bootstrapStatus !== 'idle' || homeBootstrapData) {
      return;
    }

    void bootstrapHomeDataAction();
  }, [homeBootstrapData, bootstrapHomeDataAction, bootstrapStatus, selectedProfile, session]);

  useEffect(() => {
    if (!session || !selectedProfile || bootstrapStatus !== 'ready' || !homeBootstrapData) {
      return;
    }

    const refreshKey = `${session.portalCode}:${selectedProfile.id}`;
    if (backgroundRefreshKeyRef.current === refreshKey) {
      return;
    }

    backgroundRefreshKeyRef.current = refreshKey;
    void refreshHomeBootstrapDataAction();
  }, [bootstrapStatus, homeBootstrapData, refreshHomeBootstrapDataAction, selectedProfile, session]);

  if (session) {
    if (!selectedProfile || profileSelectionSource === 'home-sidebar') {
      return <ProfileSelectionScreen />;
    }

    if (bootstrapStatus !== 'ready' || !homeBootstrapData) {
      return <StartupLoaderScreen />;
    }

    return <AppShell />;
  }

  if (onboardingScreen === 'welcome') {
    return (
      <WelcomeScreen
        onCreateAccount={() => {
          setStatusMessage('Preparing LG activation...');
          setOnboardingScreen('register');
        }}
        onSignIn={() => setOnboardingScreen('login')}
      />
    );
  }

  if (onboardingScreen === 'register') {
    return <RegistrationScreen onBack={() => setOnboardingScreen('welcome')} />;
  }

  return <LoginScreen onBack={() => setOnboardingScreen('welcome')} />;
}

export default Router;

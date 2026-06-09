import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentScreen,
  eyebrow,
  mergeStyle,
  panelAction,
  panelActionActive,
  panelActionGhost,
  panelActions,
  panelCardGrid,
  panelCopy,
  panelHeader,
  panelInfoCard,
  panelInfoLabel,
  panelInfoValue,
  panelScreenBase,
  panelSidebar,
  panelTitle,
  settingsMenuItem,
  settingsMenuItemActive,
  settingsMenuItemCopy,
  settingsMenuItemTitle,
  settingsMenuItemTitleActive,
  settingsMenuList,
  settingsPanel,
  settingsProfileAvatar,
  settingsProfileAvatarKids,
  settingsProfileCard,
  settingsProfileCardActive,
  settingsProfileGrid,
  settingsProfileName,
  settingsSection,
  settingsToggle,
  settingsToggleActive,
  settingsToggleHint,
  settingsToggleTitle,
  settingsToggleValue
} from '../../styles/lgTvStyles';
import { useAppStore } from '../../store/appStore';
import { PRESET_AVATARS, AVATAR_OPTIONS } from '../profiles/ProfileSelectionScreen';
import type { CSSProperties } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useWatchlistStore, { buildWatchlistScope } from '../../store/watchlistStore';

type SettingsSection = 'account' | 'profiles' | 'app' | 'about';

type SettingsMenuItem = {
  id: SettingsSection;
  label: string;
  hint: string;
};

type SettingsScreenProps = {
  isActive?: boolean;
  onRequestSidebarFocus: () => void;
};

function SettingsScreen({ isActive, onRequestSidebarFocus }: SettingsScreenProps) {
  const session = useAppStore((state) => state.session);
  const profiles = useAppStore((state) => state.profiles);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const selectProfile = useAppStore((state) => state.selectProfile);
  const addProfile = useAppStore((state) => state.addProfile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const removeProfile = useAppStore((state) => state.removeProfile);
  const bootstrapHomeData = useAppStore((state) => state.bootstrapHomeData);
  const signOut = useAppStore((state) => state.signOut);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const scope = useMemo(() => buildWatchlistScope(session?.portalCode, session?.username), [session?.portalCode, session?.username]);
  const clearWatchlist = useWatchlistStore((state) => state.clearScope);

  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const sections: SettingsMenuItem[] = [
    { id: 'account', label: 'Account', hint: 'Session and sign out' },
    { id: 'profiles', label: 'Profiles', hint: 'Switch active profile' },
    { id: 'app', label: 'App', hint: 'Local app controls' },
    { id: 'about', label: 'About', hint: 'Build details' }
  ];

  const [selectedSection, setSelectedSection] = useState<SettingsSection>('account');
  const [focusId, setFocusId] = useState<string>('section:account');
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Modal States for Profile Management inside Settings
  const [activeModal, setActiveModal] = useState<'profile-actions' | 'profile-form' | 'pin-dialog' | 'pin-unlock' | null>(null);
  const [selectedProfileForAction, setSelectedProfileForAction] = useState<UserProfile | null>(null);
  
  // Form Modal States
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formIsKids, setFormIsKids] = useState(false);
  const [formPin, setFormPin] = useState('');
  const [formFocusIndex, setFormFocusIndex] = useState(0); // 0: Name, 1: Avatar, 2: Kids, 3: PIN Button, 4: Save, 5: Cancel, 6: Delete
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingInitials, setIsEditingInitials] = useState(false);

  // PIN Dialog States
  const [pinMode, setPinMode] = useState<'set' | 'unlock'>('set');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinFocusIndex, setPinFocusIndex] = useState(0); // 0-3: digits, 4: Save/Unlock, 5: Cancel
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinTargetProfile, setPinTargetProfile] = useState<UserProfile | null>(null);
  const [onPinSuccess, setOnPinSuccess] = useState<(() => void) | null>(null);

  // Profile Action Menu focus
  const [actionFocusIndex, setActionFocusIndex] = useState(0); // 0: Select, 1: Edit, 2: Cancel

  // Input refs for OSK focus
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const formRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const registerFocusRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      focusRefs.current[id] = node;
      return;
    }

    delete focusRefs.current[id];
  };

  const sectionActionIds = useMemo(() => {
    switch (selectedSection) {
      case 'account':
        return ['account:signout'];
      case 'profiles':
        return [...profiles.map((profile) => `profile:${profile.id}`), 'profile:add'];
      case 'app':
        return ['app:reload', 'app:clearwatchlist', 'app:reset'];
      case 'about':
        return ['about:info'];
      default:
        return [];
    }
  }, [profiles, selectedSection]);

  useEffect(() => {
    if (!isActive || activeModal !== null) return;
    const node = focusRefs.current[focusId];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusId, activeModal, isActive]);

  useEffect(() => {
    if (activeModal !== null) return;
    setFocusId(`section:${selectedSection}`);
  }, [selectedSection, activeModal]);

  const menuIndex = sections.findIndex((section) => section.id === selectedSection);

  const moveSection = (nextIndex: number) => {
    const nextSection = sections[Math.max(0, Math.min(nextIndex, sections.length - 1))];
    if (!nextSection) {
      return;
    }

    setSelectedSection(nextSection.id);
    setFocusId(`section:${nextSection.id}`);
  };

  const focusAction = (index: number) => {
    const nextId = sectionActionIds[index];
    if (!nextId) {
      return;
    }

    setFocusId(nextId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (activeModal !== null) {
      // Let modal handle keys
      return;
    }

    if (focusId.startsWith('section:')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onRequestSidebarFocus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSection(menuIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSection(menuIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusAction(0);
      }

      return;
    }

    const actionIndex = sectionActionIds.indexOf(focusId);

    if (selectedSection === 'app') {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusAction(Math.min(actionIndex + 1, sectionActionIds.length - 1));
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (actionIndex <= 0) {
          setFocusId(`section:${selectedSection}`);
        } else {
          focusAction(actionIndex - 1);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusId(`section:${selectedSection}`);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        return;
      }
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusAction(Math.min(actionIndex + 1, sectionActionIds.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (actionIndex <= 0) {
        setFocusId(`section:${selectedSection}`);
        return;
      }

      focusAction(actionIndex - 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusId(`section:${selectedSection}`);
    }
  };

  // Profile Action Menu keyboard handler
  useEffect(() => {
    if (activeModal !== 'profile-actions') return;

    const handleActionKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setActionFocusIndex((prev) => Math.min(2, prev + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setActionFocusIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (actionFocusIndex === 0 && selectedProfileForAction) {
          // Select Profile
          if (selectedProfileForAction.pinLock) {
            setPinMode('unlock');
            setPinDigits(['', '', '', '']);
            setPinFocusIndex(0);
            setPinError(null);
            setPinTargetProfile(selectedProfileForAction);
            setOnPinSuccess(() => () => {
              selectProfile(selectedProfileForAction.id);
              void bootstrapHomeData();
              setActiveModal(null);
            });
            setActiveModal('pin-unlock');
          } else {
            selectProfile(selectedProfileForAction.id);
            void bootstrapHomeData();
            setActiveModal(null);
          }
        } else if (actionFocusIndex === 1 && selectedProfileForAction) {
          // Edit Profile
          if (selectedProfileForAction.pinLock) {
            setPinMode('unlock');
            setPinDigits(['', '', '', '']);
            setPinFocusIndex(0);
            setPinError(null);
            setPinTargetProfile(selectedProfileForAction);
            setOnPinSuccess(() => () => {
              setEditingProfile(selectedProfileForAction);
              setFormName(selectedProfileForAction.name);
              setFormAvatar(selectedProfileForAction.avatarSeed);
              setFormIsKids(!!selectedProfileForAction.isKids);
              setFormPin(selectedProfileForAction.pinLock || '');
              setFormFocusIndex(0);
              setIsEditingName(false);
              setIsEditingInitials(false);
              setActiveModal('profile-form');
            });
            setActiveModal('pin-unlock');
          } else {
            setEditingProfile(selectedProfileForAction);
            setFormName(selectedProfileForAction.name);
            setFormAvatar(selectedProfileForAction.avatarSeed);
            setFormIsKids(!!selectedProfileForAction.isKids);
            setFormPin(selectedProfileForAction.pinLock || '');
            setFormFocusIndex(0);
            setIsEditingName(false);
            setIsEditingInitials(false);
            setActiveModal('profile-form');
          }
        } else if (actionFocusIndex === 2) {
          // Cancel
          setActiveModal(null);
        }
      } else if (event.key === 'Escape' || event.key === 'Backspace' || event.keyCode === 461) {
        event.preventDefault();
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', handleActionKeyDown);
    return () => window.removeEventListener('keydown', handleActionKeyDown);
  }, [actionFocusIndex, selectedProfileForAction, activeModal]);

  // Focus action menu item
  useEffect(() => {
    if (activeModal !== 'profile-actions') return;
    const el = actionRefs.current[actionFocusIndex.toString()];
    if (el) el.focus();
  }, [actionFocusIndex, activeModal]);

  // Profile Form Modal keyboard handler
  useEffect(() => {
    if (activeModal !== 'profile-form') return;

    const maxFocusIndex = editingProfile && editingProfile.id !== 'primary' ? 7 : 6;

    const handleFormKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isEditingName) {
        if (event.key === 'Enter') {
          event.preventDefault();
          setIsEditingName(false);
        } else if (
          event.key === 'Escape' ||
          event.key === 'Backspace' ||
          event.keyCode === 461
        ) {
          event.preventDefault();
          setIsEditingName(false);
        }
        return;
      }

      if (isEditingInitials) {
        if (event.key === 'Enter') {
          event.preventDefault();
          setIsEditingInitials(false);
        } else if (
          event.key === 'Escape' ||
          event.key === 'Backspace' ||
          event.keyCode === 461
        ) {
          event.preventDefault();
          setIsEditingInitials(false);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFormFocusIndex((prev) => {
          if (prev === 1) {
            return formAvatar.startsWith('svg:') ? 3 : 2;
          }
          if (prev >= 5) return prev;
          return prev + 1;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFormFocusIndex((prev) => {
          if (prev === 3) {
            return formAvatar.startsWith('svg:') ? 1 : 2;
          }
          if (prev >= 5) return 4;
          return Math.max(0, prev - 1);
        });
      } else if (event.key === 'ArrowLeft') {
        if (formFocusIndex === 1) {
          event.preventDefault();
          setFormAvatar((current) => {
            const isSvg = current.startsWith('svg:');
            const currentIndex = isSvg ? AVATAR_OPTIONS.findIndex((o) => o.id === current) : 6;
            const nextIndex = (currentIndex - 1 + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;
            const nextOption = AVATAR_OPTIONS[nextIndex];
            return nextOption.id === 'custom' ? '' : nextOption.id;
          });
        } else if (formFocusIndex >= 5) {
          event.preventDefault();
          setFormFocusIndex((prev) => Math.max(5, prev - 1));
        }
      } else if (event.key === 'ArrowRight') {
        if (formFocusIndex === 1) {
          event.preventDefault();
          setFormAvatar((current) => {
            const isSvg = current.startsWith('svg:');
            const currentIndex = isSvg ? AVATAR_OPTIONS.findIndex((o) => o.id === current) : 6;
            const nextIndex = (currentIndex + 1) % AVATAR_OPTIONS.length;
            const nextOption = AVATAR_OPTIONS[nextIndex];
            return nextOption.id === 'custom' ? '' : nextOption.id;
          });
        } else if (formFocusIndex >= 5) {
          event.preventDefault();
          setFormFocusIndex((prev) => Math.min(maxFocusIndex, prev + 1));
        }
      } else if (event.key === 'Enter') {
        if (formFocusIndex === 0) {
          event.preventDefault();
          setIsEditingName(true);
        } else if (formFocusIndex === 1) {
          event.preventDefault();
          if (!formAvatar.startsWith('svg:')) {
            setIsEditingInitials(true);
            setFormFocusIndex(2);
          } else {
            setFormFocusIndex(3);
          }
        } else if (formFocusIndex === 2) {
          event.preventDefault();
          setIsEditingInitials(true);
        } else if (formFocusIndex === 3) {
          event.preventDefault();
          setFormIsKids((prev) => !prev);
        } else if (formFocusIndex === 4) {
          event.preventDefault();
          if (formPin) {
            setFormPin('');
          } else {
            setPinMode('set');
            setPinDigits(['', '', '', '']);
            setPinFocusIndex(0);
            setPinError(null);
            setActiveModal('pin-dialog');
          }
        } else if (formFocusIndex === 5) {
          event.preventDefault();
          if (!formName.trim()) return;
          if (editingProfile) {
            updateProfile(editingProfile.id, {
              name: formName,
              avatarSeed: formAvatar,
              isKids: formIsKids,
              pinLock: formPin || undefined
            });
          } else {
            addProfile(formName, formAvatar || 'svg:smile', formIsKids, formPin);
          }
          setActiveModal(null);
        } else if (formFocusIndex === 6) {
          event.preventDefault();
          setActiveModal(null);
        } else if (formFocusIndex === 7) {
          event.preventDefault();
          if (editingProfile && editingProfile.id !== 'primary') {
            removeProfile(editingProfile.id);
            setActiveModal(null);
          }
        }
      } else if (event.key === 'Escape' || event.key === 'Backspace' || event.keyCode === 461) {
        event.preventDefault();
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', handleFormKeyDown);
    return () => window.removeEventListener('keydown', handleFormKeyDown);
  }, [formFocusIndex, formName, formAvatar, formIsKids, formPin, editingProfile, activeModal, isEditingName, isEditingInitials]);

  // Focus form fields
  useEffect(() => {
    if (activeModal !== 'profile-form') return;
    if (isEditingName || isEditingInitials) return;
    const el = formRefs.current[formFocusIndex.toString()];
    if (el) {
      el.focus();
    }
  }, [formFocusIndex, activeModal, isEditingName, isEditingInitials]);

  // Focus name input when entering editing mode
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Focus initials input when entering editing mode
  useEffect(() => {
    if (isEditingInitials && avatarInputRef.current) {
      avatarInputRef.current.focus();
      avatarInputRef.current.select();
    }
  }, [isEditingInitials]);

  // PIN Dialog / PIN Unlock keyboard handler
  useEffect(() => {
    if (activeModal !== 'pin-dialog' && activeModal !== 'pin-unlock') return;

    const handlePinKeyDown = (event: globalThis.KeyboardEvent) => {
      // 0-9 Direct Entry
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        if (pinFocusIndex >= 0 && pinFocusIndex <= 3) {
          const newDigits = [...pinDigits];
          newDigits[pinFocusIndex] = event.key;
          setPinDigits(newDigits);
          setPinError(null);
          if (pinFocusIndex < 3) {
            setPinFocusIndex(pinFocusIndex + 1);
          }
        }
        return;
      }

      // Backspace
      if (event.key === 'Backspace') {
        event.preventDefault();
        if (pinFocusIndex >= 0 && pinFocusIndex <= 3) {
          const newDigits = [...pinDigits];
          if (newDigits[pinFocusIndex] !== '') {
            newDigits[pinFocusIndex] = '';
            setPinDigits(newDigits);
          } else if (pinFocusIndex > 0) {
            newDigits[pinFocusIndex - 1] = '';
            setPinDigits(newDigits);
            setPinFocusIndex(pinFocusIndex - 1);
          }
          setPinError(null);
        }
        return;
      }

      // Navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (pinFocusIndex > 0 && pinFocusIndex <= 3) {
          setPinFocusIndex(pinFocusIndex - 1);
        } else if (pinFocusIndex === 0) {
          setPinFocusIndex(4); // Escape left to bottom-left Save/Unlock button
        } else if (pinFocusIndex === 5) {
          setPinFocusIndex(4); // Cancel to Save/Unlock
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (pinFocusIndex >= 0 && pinFocusIndex < 3) {
          setPinFocusIndex(pinFocusIndex + 1);
        } else if (pinFocusIndex === 3) {
          setPinFocusIndex(5); // Escape right to bottom-right Cancel button
        } else if (pinFocusIndex === 4) {
          setPinFocusIndex(5); // Save/Unlock to Cancel
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (pinFocusIndex === 4) {
          setPinFocusIndex(0); // Return to digit slot 0
        } else if (pinFocusIndex === 5) {
          setPinFocusIndex(3); // Return to digit slot 3
        } else if (pinFocusIndex >= 0 && pinFocusIndex <= 3) {
          const currentVal = parseInt(pinDigits[pinFocusIndex]) || 0;
          const newVal = (currentVal + 1) % 10;
          const newDigits = [...pinDigits];
          newDigits[pinFocusIndex] = newVal.toString();
          setPinDigits(newDigits);
          setPinError(null);
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (pinFocusIndex >= 0 && pinFocusIndex <= 3) {
          const currentVal = parseInt(pinDigits[pinFocusIndex]) || 0;
          const newVal = (currentVal - 1 + 10) % 10;
          const newDigits = [...pinDigits];
          newDigits[pinFocusIndex] = newVal.toString();
          setPinDigits(newDigits);
          setPinError(null);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (pinFocusIndex === 4 || (pinFocusIndex >= 0 && pinFocusIndex <= 3 && pinDigits.every((d) => d !== ''))) {
          const pinString = pinDigits.join('');
          if (pinString.length !== 4) {
            setPinError('Please enter a 4-digit code');
            return;
          }

          if (activeModal === 'pin-unlock') {
            if (pinTargetProfile && pinTargetProfile.pinLock === pinString) {
              setActiveModal(null);
              if (onPinSuccess) onPinSuccess();
            } else {
              setPinError('Incorrect Passcode. Try again.');
              setPinDigits(['', '', '', '']);
              setPinFocusIndex(0);
            }
          } else {
            setFormPin(pinString);
            setActiveModal('profile-form');
          }
        } else if (pinFocusIndex === 5) {
          if (activeModal === 'pin-unlock') {
            setActiveModal(null);
            setPinTargetProfile(null);
          } else {
            setActiveModal('profile-form');
          }
        }
      } else if (event.key === 'Escape' || event.key === 'GoBack' || event.keyCode === 461) {
        event.preventDefault();
        if (activeModal === 'pin-unlock') {
          setActiveModal(null);
          setPinTargetProfile(null);
        } else {
          setActiveModal('profile-form');
        }
      }
    };

    window.addEventListener('keydown', handlePinKeyDown);
    return () => window.removeEventListener('keydown', handlePinKeyDown);
  }, [pinFocusIndex, pinDigits, activeModal, pinTargetProfile, pinMode, onPinSuccess]);

  // Focus PIN inputs/buttons
  useEffect(() => {
    if (activeModal !== 'pin-dialog' && activeModal !== 'pin-unlock') return;
    const el = pinRefs.current[pinFocusIndex.toString()];
    if (el) el.focus();
  }, [pinFocusIndex, activeModal]);

  const appVersion = 'v0.1.0';
  const loginLabel = session ? `Signed in as ${session.username}` : 'Not signed in';

  // Redesigned settings UI styling helper functions
  const getMenuItemStyle = (isFocused: boolean, isActive: boolean): CSSProperties => {
    return {
      border: 0,
      borderRadius: '14px',
      padding: '16px 20px',
      background: isFocused 
        ? '#ffffff' 
        : isActive 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(255, 255, 255, 0.02)',
      color: isFocused ? '#07090e' : 'rgba(255, 255, 255, 0.62)',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      cursor: 'pointer',
      boxSizing: 'border-box',
      outline: 'none',
      position: 'relative',
      overflow: 'hidden',
      transform: isFocused ? 'scale(1.03) translate3d(2px, 0, 0)' : 'none',
      boxShadow: isFocused 
        ? '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255,255,255,0.1)' 
        : 'none',
      transition: 'background 180ms ease, color 180ms ease, transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 180ms ease'
    };
  };

  const infoCardStyle: CSSProperties = {
    padding: '22px 24px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxSizing: 'border-box',
    transition: 'border-color 150ms ease, background 150ms ease'
  };

  const infoLabelStyle: CSSProperties = {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: '6px'
  };

  const infoValueStyle: CSSProperties = {
    display: 'block',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    wordBreak: 'break-all'
  };

  const getButtonStyle = (isFocused: boolean, isGhost: boolean = false): CSSProperties => {
    return {
      border: 0,
      borderRadius: '14px',
      height: '56px',
      padding: '0 28px',
      background: isFocused 
        ? '#ffffff' 
        : isGhost 
        ? 'rgba(255, 255, 255, 0.05)' 
        : '#e50914', // Netflix Red
      color: isFocused ? '#07090e' : '#ffffff',
      fontSize: '16px',
      fontWeight: 800,
      textAlign: 'center',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxSizing: 'border-box',
      outline: 'none',
      transform: isFocused ? 'scale(1.04) translate3d(0, -2px, 0)' : 'none',
      boxShadow: isFocused 
        ? '0 12px 24px rgba(229, 9, 20, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
        : 'none',
      transition: 'background 150ms ease, color 150ms ease, transform 180ms ease, box-shadow 150ms ease'
    };
  };

  const getProfileCardStyle = (isFocused: boolean, isSelected: boolean): CSSProperties => {
    return {
      border: isFocused 
        ? '2px solid #ffffff' 
        : isSelected 
        ? '2px solid #ff2438' 
        : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '16px 20px',
      background: isFocused ? 'rgba(255,255,255,0.06)' : 'rgba(255, 255, 255, 0.02)',
      color: '#ffffff',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      maxWidth: '540px',
      cursor: 'pointer',
      outline: 'none',
      transform: isFocused ? 'scale(1.02) translate3d(0, -2px, 0)' : 'none',
      boxShadow: isFocused ? '0 12px 24px rgba(0,0,0,0.4)' : 'none',
      transition: 'all 180ms ease'
    };
  };

  const getAddProfileCardStyle = (isFocused: boolean): CSSProperties => {
    return {
      border: isFocused ? '2px dashed #ffffff' : '2px dashed rgba(255,255,255,0.15)',
      borderRadius: '18px',
      padding: '16px 20px',
      background: isFocused ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: isFocused ? '#ffffff' : 'rgba(255,255,255,0.4)',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '540px',
      height: '82px',
      cursor: 'pointer',
      outline: 'none',
      transform: isFocused ? 'scale(1.02) translate3d(0, -2px, 0)' : 'none',
      boxShadow: isFocused ? '0 12px 24px rgba(0,0,0,0.4)' : 'none',
      transition: 'all 180ms ease'
    };
  };

  const getToggleButtonStyle = (isFocused: boolean): CSSProperties => {
    return {
      border: isFocused ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '16px 20px',
      background: isFocused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
      color: '#ffffff',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: '580px',
      cursor: 'pointer',
      outline: 'none',
      transform: isFocused ? 'scale(1.02) translate3d(0, -2px, 0)' : 'none',
      boxShadow: isFocused ? '0 12px 24px rgba(0,0,0,0.4)' : 'none',
      transition: 'all 180ms ease'
    };
  };

  return (
    <section
      style={mergeStyle(contentScreen, panelScreenBase)}
      aria-label="Settings"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <aside style={panelSidebar}>
        <div style={panelHeader}>
          <p style={eyebrow}>Settings</p>
          <h1 style={panelTitle}>Device and account</h1>
          <p style={panelCopy}>
            Adjust playback, profile, and app preferences from one TV-friendly control panel.
          </p>
        </div>

        <div style={settingsMenuList} role="tablist" aria-label="Settings sections">
          {sections.map((section) => {
            const focus = `section:${section.id}`;
            const isActive = selectedSection === section.id;
            const isFocused = focusId === focus;

            return (
              <button
                key={section.id}
                ref={registerFocusRef(focus)}
                type="button"
                role="tab"
                aria-selected={isActive}
                style={getMenuItemStyle(isFocused, isActive)}
                onFocus={() => {
                  setSelectedSection(section.id);
                  setFocusId(focus);
                }}
                onClick={() => {
                  setSelectedSection(section.id);
                  setFocusId(focus);
                }}
              >
                {isActive || isFocused ? (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '14px',
                      bottom: '14px',
                      width: '4px',
                      borderRadius: '999px',
                      background: '#ff2438'
                    }}
                  />
                ) : null}
                <strong style={{ 
                  color: isFocused ? '#07090e' : '#ffffff', 
                  fontSize: '18px', 
                  fontWeight: 800,
                  paddingLeft: '6px'
                }}>
                  {section.label}
                </strong>
                <span style={{ 
                  color: isFocused ? 'rgba(7, 9, 14, 0.65)' : 'rgba(255, 255, 255, 0.45)', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  paddingLeft: '6px'
                }}>
                  {section.hint}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div style={settingsPanel}>
        {selectedSection === 'account' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>Account</p>
            <h2 style={panelTitle}>{loginLabel}</h2>
            <div style={panelCardGrid}>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Server</span>
                <strong style={infoValueStyle}>{session?.serverName || 'No active server'}</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Portal</span>
                <strong style={infoValueStyle}>{session?.portalCode || '—'}</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Login time</span>
                <strong style={infoValueStyle}>
                  {session?.authenticatedAt ? new Date(session.authenticatedAt).toLocaleString() : '—'}
                </strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('account:signout')}
                type="button"
                style={getButtonStyle(focusId === 'account:signout')}
                onFocus={() => setFocusId('account:signout')}
                onClick={signOut}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : null}

        {selectedSection === 'profiles' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>Profiles</p>
            <h2 style={panelTitle}>Choose or manage profiles</h2>
            <div style={settingsProfileGrid}>
              {profiles.map((profile) => {
                const focus = `profile:${profile.id}`;
                const isSelected = selectedProfile?.id === profile.id;
                const isFocused = focusId === focus;

                return (
                  <button
                    key={profile.id}
                    ref={registerFocusRef(focus)}
                    type="button"
                    style={getProfileCardStyle(isFocused, isSelected)}
                    onFocus={() => setFocusId(focus)}
                    onClick={() => {
                      setSelectedProfileForAction(profile);
                      setActionFocusIndex(0);
                      setActiveModal('profile-actions');
                    }}
                  >
                    <div 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '10px', 
                        overflow: 'hidden', 
                        flexShrink: 0,
                        marginRight: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: profile.avatarSeed && PRESET_AVATARS[profile.avatarSeed]
                          ? 'transparent'
                          : profile.isKids
                          ? 'linear-gradient(135deg, #3a8dff 0%, #002280 100%)'
                          : 'linear-gradient(135deg, #ff4c4c 0%, #66000c 100%)'
                      }}
                    >
                      {profile.avatarSeed && PRESET_AVATARS[profile.avatarSeed] ? (
                        PRESET_AVATARS[profile.avatarSeed]()
                      ) : (
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
                          {profile.avatarSeed ? profile.avatarSeed.slice(0, 2).toUpperCase() : 'PR'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={settingsProfileName}>
                        {profile.pinLock && (
                          <span style={{ marginRight: '6px' }}>🔒</span>
                        )}
                        {profile.name}
                      </strong>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)' }}>
                        {profile.isKids ? 'Kids profile' : 'Primary profile'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Add Profile card button */}
              <button
                ref={registerFocusRef('profile:add')}
                type="button"
                style={getAddProfileCardStyle(focusId === 'profile:add')}
                onFocus={() => setFocusId('profile:add')}
                onClick={() => {
                  setEditingProfile(null);
                  setFormName('');
                  setFormAvatar('');
                  setFormIsKids(false);
                  setFormPin('');
                  setFormFocusIndex(0);
                  setIsEditingName(false);
                  setIsEditingInitials(false);
                  setActiveModal('profile-form');
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 800 }}>+ Add Profile</span>
              </button>
            </div>
          </div>
        ) : null}

      {/* Profile Actions Popup Menu */}
      {activeModal === 'profile-actions' && selectedProfileForAction && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div
            style={{
              width: '440px',
              padding: '36px',
              borderRadius: '28px',
              background: 'linear-gradient(180deg, #161b26 0%, #0d1017 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxSizing: 'border-box',
              textAlign: 'center'
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#ff2438', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Profile Manager
              </p>
              <h2 style={{ margin: '6px 0 0', fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                {selectedProfileForAction.name}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                ref={(el) => {
                  actionRefs.current['0'] = el;
                }}
                type="button"
                onClick={() => {
                  if (selectedProfileForAction.pinLock) {
                    setPinMode('unlock');
                    setPinDigits(['', '', '', '']);
                    setPinFocusIndex(0);
                    setPinError(null);
                    setPinTargetProfile(selectedProfileForAction);
                    setOnPinSuccess(() => () => {
                      selectProfile(selectedProfileForAction.id);
                      void bootstrapHomeData();
                      setActiveModal(null);
                    });
                    setActiveModal('pin-unlock');
                  } else {
                    selectProfile(selectedProfileForAction.id);
                    void bootstrapHomeData();
                    setActiveModal(null);
                  }
                }}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: actionFocusIndex === 0 ? '#ffffff' : 'rgba(255,255,255,0.05)',
                  color: actionFocusIndex === 0 ? '#080b14' : '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  transform: actionFocusIndex === 0 ? 'scale(1.02)' : 'none',
                  boxShadow: actionFocusIndex === 0 ? '0 12px 20px rgba(0,0,0,0.25)' : 'none',
                  transition: 'transform 100ms, background-color 100ms, color 100ms'
                }}
              >
                Select Profile
              </button>

              <button
                ref={(el) => {
                  actionRefs.current['1'] = el;
                }}
                type="button"
                onClick={() => {
                  if (selectedProfileForAction.pinLock) {
                    setPinMode('unlock');
                    setPinDigits(['', '', '', '']);
                    setPinFocusIndex(0);
                    setPinError(null);
                    setPinTargetProfile(selectedProfileForAction);
                    setOnPinSuccess(() => () => {
                      setEditingProfile(selectedProfileForAction);
                      setFormName(selectedProfileForAction.name);
                      setFormAvatar(selectedProfileForAction.avatarSeed);
                      setFormIsKids(!!selectedProfileForAction.isKids);
                      setFormPin(selectedProfileForAction.pinLock || '');
                      setFormFocusIndex(0);
                      setActiveModal('profile-form');
                    });
                    setActiveModal('pin-unlock');
                  } else {
                    setEditingProfile(selectedProfileForAction);
                    setFormName(selectedProfileForAction.name);
                    setFormAvatar(selectedProfileForAction.avatarSeed);
                    setFormIsKids(!!selectedProfileForAction.isKids);
                    setFormPin(selectedProfileForAction.pinLock || '');
                    setFormFocusIndex(0);
                    setActiveModal('profile-form');
                  }
                }}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: actionFocusIndex === 1 ? '#ffffff' : 'rgba(255,255,255,0.05)',
                  color: actionFocusIndex === 1 ? '#080b14' : '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  transform: actionFocusIndex === 1 ? 'scale(1.02)' : 'none',
                  boxShadow: actionFocusIndex === 1 ? '0 12px 20px rgba(0,0,0,0.25)' : 'none',
                  transition: 'transform 100ms, background-color 100ms, color 100ms'
                }}
              >
                Edit Profile
              </button>

              <button
                ref={(el) => {
                  actionRefs.current['2'] = el;
                }}
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: actionFocusIndex === 2 ? '#ff3446' : '#1f2636',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  transform: actionFocusIndex === 2 ? 'scale(1.02)' : 'none',
                  boxShadow: actionFocusIndex === 2 ? '0 12px 20px rgba(229,9,20,0.2)' : 'none',
                  transition: 'transform 100ms, background-color 100ms'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Form Modal */}
      {activeModal === 'profile-form' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div
            style={{
              width: '560px',
              padding: '40px',
              borderRadius: '32px',
              background: 'linear-gradient(180deg, #161b26 0%, #0d1017 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxSizing: 'border-box'
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#b6a86c', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Profile Editor
              </p>
              <h2 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800, color: '#ffffff' }}>
                {editingProfile ? 'Edit Profile' : 'Create Profile'}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Profile Name</label>
                {isEditingName ? (
                  <input
                    ref={(el) => {
                      formRefs.current['0'] = el;
                      nameInputRef.current = el;
                    }}
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter name..."
                    style={{
                      width: '100%',
                      height: '56px',
                      borderRadius: '14px',
                      border: '2px solid #ff2438',
                      background: '#121620',
                      color: '#ffffff',
                      padding: '0 18px',
                      fontSize: '18px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 0 12px rgba(255,36,56,0.2)'
                    }}
                  />
                ) : (
                  <button
                    ref={(el) => {
                      formRefs.current['0'] = el as unknown as HTMLButtonElement;
                    }}
                    type="button"
                    style={{
                      width: '100%',
                      height: '56px',
                      borderRadius: '14px',
                      border: formFocusIndex === 0 ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.08)',
                      background: '#121620',
                      color: formName ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      padding: '0 18px',
                      fontSize: '18px',
                      fontWeight: 500,
                      textAlign: 'left',
                      outline: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      boxShadow: formFocusIndex === 0 ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'
                    }}
                  >
                    <span>{formName || 'Enter name...'}</span>
                    {formFocusIndex === 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 700, background: '#ff2438', color: '#ffffff', padding: '4px 8px', borderRadius: '6px' }}>
                        Press Enter to Type
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Profile Avatar Selection Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Profile Avatar</label>
                <div 
                  ref={(el) => {
                    formRefs.current['1'] = el;
                  }}
                  tabIndex={-1}
                  style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', padding: '6px 0', outline: 'none' }}
                >
                  {AVATAR_OPTIONS.map((opt) => {
                    const isSelected = opt.id === 'custom' 
                      ? !formAvatar.startsWith('svg:')
                      : formAvatar === opt.id;
                      
                    const isFieldFocused = formFocusIndex === 1;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormFocusIndex(1);
                          if (opt.id === 'custom') {
                            setFormAvatar('');
                            setIsEditingInitials(true);
                          } else {
                            setFormAvatar(opt.id);
                          }
                        }}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          border: isSelected 
                            ? (isFieldFocused ? '3.5px solid #ff2438' : '2.5px solid #ffffff')
                            : '2.5px solid transparent',
                          boxSizing: 'border-box',
                          padding: '2px',
                          background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                          transition: 'all 120ms ease',
                          transform: isSelected && isFieldFocused ? 'scale(1.1)' : 'none',
                          opacity: isSelected ? 1 : 0.45,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {opt.id === 'custom' ? (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            borderRadius: '8px', 
                            background: '#1c2230', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#ffffff'
                          }}>
                            Text
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                            {PRESET_AVATARS[opt.id]()}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text input, only active when custom initials is selected */}
              {!formAvatar.startsWith('svg:') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Avatar Initials (1-2 letters)</label>
                  {isEditingInitials ? (
                    <input
                      ref={(el) => {
                        formRefs.current['2'] = el;
                        avatarInputRef.current = el;
                      }}
                      type="text"
                      maxLength={2}
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value.toUpperCase())}
                      placeholder="e.g. ME"
                      style={{
                        width: '100%',
                        height: '56px',
                        borderRadius: '14px',
                        border: '2px solid #ff2438',
                        background: '#121620',
                        color: '#ffffff',
                        padding: '0 18px',
                        fontSize: '18px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        boxShadow: '0 0 12px rgba(255,36,56,0.2)'
                      }}
                    />
                  ) : (
                    <button
                      ref={(el) => {
                        formRefs.current['2'] = el as unknown as HTMLButtonElement;
                      }}
                      type="button"
                      style={{
                        width: '100%',
                        height: '56px',
                        borderRadius: '14px',
                        border: formFocusIndex === 2 ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.08)',
                        background: '#121620',
                        color: formAvatar ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        padding: '0 18px',
                        fontSize: '18px',
                        fontWeight: 500,
                        textAlign: 'left',
                        outline: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        boxShadow: formFocusIndex === 2 ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'
                      }}
                    >
                      <span>{formAvatar || 'e.g. ME'}</span>
                      {formFocusIndex === 2 && (
                        <span style={{ fontSize: '12px', fontWeight: 700, background: '#ff2438', color: '#ffffff', padding: '4px 8px', borderRadius: '6px' }}>
                          Press Enter to Type
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Kids Toggle */}
              <button
                ref={(el) => {
                  formRefs.current['3'] = el;
                }}
                type="button"
                onClick={() => setFormIsKids((prev) => !prev)}
                style={{
                  height: '56px',
                  width: '100%',
                  borderRadius: '14px',
                  border: formFocusIndex === 3 ? '2px solid #ff2438' : '1px solid rgba(255,255,255,0.08)',
                  background: formFocusIndex === 3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 18px',
                  fontSize: '18px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <span>Kids Profile</span>
                <span style={{ color: formIsKids ? '#3568ff' : 'rgba(255,255,255,0.3)' }}>
                  {formIsKids ? 'Enabled' : 'Disabled'}
                </span>
              </button>

              {/* PIN Toggle */}
              <button
                ref={(el) => {
                  formRefs.current['4'] = el;
                }}
                type="button"
                onClick={() => {
                  if (formPin) {
                    setFormPin('');
                  } else {
                    setPinMode('set');
                    setPinDigits(['', '', '', '']);
                    setPinFocusIndex(0);
                    setPinError(null);
                    setActiveModal('pin-dialog');
                  }
                }}
                style={{
                  height: '56px',
                  width: '100%',
                  borderRadius: '14px',
                  border: formFocusIndex === 4 ? '2px solid #ff2438' : '1px solid rgba(255,255,255,0.08)',
                  background: formFocusIndex === 4 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 18px',
                  fontSize: '18px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <span>PIN Passcode Lock</span>
                <span style={{ color: formPin ? '#f5d06a' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
                  {formPin ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Lock Enabled
                    </>
                  ) : (
                    'Lock Disabled'
                  )}
                </span>
              </button>
            </div>

            {/* Actions row */}
            <div style={{ display: 'grid', gridTemplateColumns: editingProfile && editingProfile.id !== 'primary' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <button
                ref={(el) => {
                  formRefs.current['5'] = el;
                }}
                type="button"
                onClick={() => {
                  if (!formName.trim()) return;
                  if (editingProfile) {
                    updateProfile(editingProfile.id, {
                      name: formName,
                      avatarSeed: formAvatar,
                      isKids: formIsKids,
                      pinLock: formPin || undefined
                    });
                  } else {
                    addProfile(formName, formAvatar, formIsKids, formPin);
                  }
                  setActiveModal(null);
                }}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(180deg, #ff3446 0%, #d50d1a 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transform: formFocusIndex === 5 ? 'scale(1.02)' : 'none',
                  boxShadow: formFocusIndex === 5 ? '0 0 0 3px #ffffff, 0 12px 22px rgba(229,9,20,0.3)' : 'none'
                }}
              >
                Save
              </button>

              <button
                ref={(el) => {
                  formRefs.current['6'] = el;
                }}
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: '#1f2636',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transform: formFocusIndex === 6 ? 'scale(1.02)' : 'none',
                  boxShadow: formFocusIndex === 6 ? '0 0 0 3px #ffffff' : 'none'
                }}
              >
                Cancel
              </button>

              {editingProfile && editingProfile.id !== 'primary' && (
                <button
                  ref={(el) => {
                    formRefs.current['7'] = el;
                  }}
                  type="button"
                  onClick={() => {
                    removeProfile(editingProfile.id);
                    setActiveModal(null);
                  }}
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: '#5a1622',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 800,
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transform: formFocusIndex === 7 ? 'scale(1.02)' : 'none',
                    boxShadow: formFocusIndex === 7 ? '0 0 0 3px #ffffff' : 'none'
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN Passcode Modal (Set PIN or Unlock PIN) */}
      {(activeModal === 'pin-dialog' || activeModal === 'pin-unlock') && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3, 4, 7, 0.9)',
            backdropFilter: 'blur(24px)'
          }}
        >
          <div
            style={{
              width: '500px',
              padding: '40px',
              borderRadius: '28px',
              background: '#0d1017',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 28px 70px rgba(0,0,0,0.65)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#f5d06a', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Security Lock
              </p>
              <h2 style={{ margin: '8px 0 0', fontSize: '30px', fontWeight: 800, color: '#ffffff' }}>
                {activeModal === 'pin-unlock'
                  ? `Enter PIN for ${pinTargetProfile?.name}`
                  : 'Set Profile Passcode'}
              </h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
                Use digits 0-9 to set code. Arrow Up/Down to adjust.
              </p>
            </div>

            {/* Digits row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', margin: '10px 0' }}>
              {[0, 1, 2, 3].map((idx) => {
                const digit = pinDigits[idx];
                const isDigitFocused = pinFocusIndex === idx;
                const isFilled = digit !== '';

                return (
                  <button
                    key={idx}
                    ref={(el) => {
                      pinRefs.current[idx.toString()] = el;
                    }}
                    type="button"
                    onFocus={() => setPinFocusIndex(idx)}
                    style={{
                      width: '64px',
                      height: '80px',
                      borderRadius: '16px',
                      background: isDigitFocused ? '#1e2536' : isFilled ? '#141822' : '#0d1017',
                      border: isDigitFocused
                        ? '3px solid #ff2438'
                        : isFilled
                        ? '1px solid rgba(255,255,255,0.25)'
                        : '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '32px',
                      fontWeight: '800',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isDigitFocused ? '0 0 16px rgba(255,36,56,0.3)' : 'none',
                      transition: 'border-color 100ms ease, background-color 100ms ease'
                    }}
                  >
                    {isFilled ? (activeModal === 'pin-unlock' ? '●' : digit) : ''}
                  </button>
                );
              })}
            </div>

            {/* Error state */}
            {pinError && (
              <p style={{ margin: 0, color: '#ff3446', fontSize: '16px', fontWeight: 600 }}>
                {pinError}
              </p>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', width: '100%', marginTop: '8px' }}>
              <button
                ref={(el) => {
                  pinRefs.current['4'] = el;
                }}
                type="button"
                onFocus={() => setPinFocusIndex(4)}
                onClick={() => {
                  const pinString = pinDigits.join('');
                  if (pinString.length !== 4) {
                    setPinError('Please enter a 4-digit code');
                    return;
                  }

                  if (activeModal === 'pin-unlock') {
                    if (pinTargetProfile && pinTargetProfile.pinLock === pinString) {
                      setActiveModal(null);
                      if (onPinSuccess) onPinSuccess();
                    } else {
                      setPinError('Incorrect Passcode. Try again.');
                      setPinDigits(['', '', '', '']);
                      setPinFocusIndex(0);
                    }
                  } else {
                    setFormPin(pinString);
                    setActiveModal('profile-form');
                  }
                }}
                style={{
                  height: '58px',
                  borderRadius: '16px',
                  background: 'linear-gradient(180deg, #ff3446 0%, #d50d1a 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  transform: pinFocusIndex === 4 ? 'scale(1.02)' : 'none',
                  boxShadow: pinFocusIndex === 4 ? '0 0 0 3px #ffffff, 0 12px 22px rgba(229,9,20,0.3)' : 'none',
                  transition: 'transform 100ms ease, box-shadow 100ms ease'
                }}
              >
                {activeModal === 'pin-unlock' ? 'Unlock' : 'Save PIN'}
              </button>

              <button
                ref={(el) => {
                  pinRefs.current['5'] = el;
                }}
                type="button"
                onFocus={() => setPinFocusIndex(5)}
                onClick={() => {
                  if (activeModal === 'pin-unlock') {
                    setActiveModal(null);
                    setPinTargetProfile(null);
                  } else {
                    setActiveModal('profile-form');
                  }
                }}
                style={{
                  height: '58px',
                  borderRadius: '16px',
                  background: '#1f2636',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  outline: 'none',
                  transform: pinFocusIndex === 5 ? 'scale(1.02)' : 'none',
                  boxShadow: pinFocusIndex === 5 ? '0 0 0 3px #ffffff' : 'none',
                  transition: 'transform 100ms ease, box-shadow 100ms ease'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



        {selectedSection === 'app' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>App</p>
            <h2 style={panelTitle}>Local app controls</h2>
            <div style={panelCardGrid}>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Version</span>
                <strong style={infoValueStyle}>{appVersion}</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Watchlist scope</span>
                <strong style={infoValueStyle}>{scope}</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Theme</span>
                <strong style={infoValueStyle}>LG webOS shell</strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('app:reload')}
                type="button"
                style={getButtonStyle(focusId === 'app:reload')}
                onFocus={() => setFocusId('app:reload')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAction(1);
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    setFocusId('section:app');
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onClick={() => window.location.reload()}
              >
                Reload app
              </button>
              <button
                ref={registerFocusRef('app:clearwatchlist')}
                type="button"
                style={getButtonStyle(focusId === 'app:clearwatchlist', true)}
                onFocus={() => setFocusId('app:clearwatchlist')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAction(2);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAction(0);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    setFocusId('section:app');
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onClick={() => {
                  clearWatchlist(scope);
                  setStatusMessage('Watchlist cleared');
                }}
              >
                Clear watchlist
              </button>
              <button
                ref={registerFocusRef('app:reset')}
                type="button"
                style={getButtonStyle(focusId === 'app:reset', true)}
                onFocus={() => setFocusId('app:reset')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAction(1);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    setFocusId('section:app');
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onClick={resetSettings}
              >
                Reset settings
              </button>
            </div>
          </div>
        ) : null}

        {selectedSection === 'about' ? (
          <div style={settingsSection}>
            <p style={eyebrow}>About</p>
            <h2 style={panelTitle}>Build and account info</h2>
            <div style={panelCardGrid}>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>LG build</span>
                <strong style={infoValueStyle}>Smartifly LG</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Status</span>
                <strong style={infoValueStyle}>{session ? 'Connected' : 'Offline'}</strong>
              </div>
              <div style={infoCardStyle}>
                <span style={infoLabelStyle}>Profile</span>
                <strong style={infoValueStyle}>{selectedProfile?.name || 'Not selected'}</strong>
              </div>
            </div>

            <div style={panelActions}>
              <button
                ref={registerFocusRef('about:info')}
                type="button"
                style={getButtonStyle(focusId === 'about:info')}
                onFocus={() => setFocusId('about:info')}
                onClick={() => setStatusMessage('Smartifly LG build info shown')}
              >
                Build info
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SettingsScreen;

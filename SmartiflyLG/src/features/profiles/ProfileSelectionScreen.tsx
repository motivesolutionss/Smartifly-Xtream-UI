import { useEffect, useRef, useState } from 'react';
import { useAppStore, type UserProfile } from '../../store/appStore';

type ActiveModal = 'profile-form' | 'pin-dialog' | 'pin-unlock' | null;

export const PRESET_AVATARS: Record<string, () => JSX.Element> = {
  'svg:smile': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-smile" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff3e6c" />
          <stop offset="100%" stopColor="#790024" />
        </radialGradient>
        <linearGradient id="face-smile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe600" />
          <stop offset="100%" stopColor="#ff8000" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-smile)" />
      <circle cx="35" cy="42" r="6" fill="url(#face-smile)" />
      <circle cx="65" cy="42" r="6" fill="url(#face-smile)" />
      <path d="M 30,58 A 20,20 0 0,0 70,58" fill="none" stroke="url(#face-smile)" strokeWidth="8" strokeLinecap="round" />
    </svg>
  ),
  'svg:astronaut': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-astro" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#2a3eff" />
          <stop offset="100%" stopColor="#090a2c" />
        </radialGradient>
        <linearGradient id="visor-astro" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#4facfe" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-astro)" />
      <path d="M 20,90 C 20,70 80,70 80,90 Z" fill="#ffffff" opacity="0.85" />
      <circle cx="50" cy="46" r="28" fill="#ffffff" />
      <rect x="30" y="32" width="40" height="26" rx="13" fill="url(#visor-astro)" />
      <path d="M 36,38 L 48,38 A 2,2 0 0,1 50,40 L 50,42 A 2,2 0 0,1 48,44 L 36,44 A 2,2 0 0,1 34,42 L 34,40 A 2,2 0 0,1 36,38" fill="#ffffff" opacity="0.4" />
    </svg>
  ),
  'svg:cool': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-cool" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffb300" />
          <stop offset="100%" stopColor="#b22c00" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-cool)" />
      <path d="M 20,38 Q 35,32 50,38 Q 65,32 80,38 L 78,52 C 76,58 70,62 64,62 L 53,62 Q 50,52 47,62 L 36,62 C 30,62 24,58 22,52 Z" fill="#15151b" />
      <path d="M 25,43 L 34,43 A 1,1 0 0,1 35,44 L 33,52 A 1,1 0 0,1 32,53 L 23,53 A 1,1 0 0,1 22,52 L 24,44 A 1,1 0 0,1 25,43" fill="#ff3d00" opacity="0.85" />
      <path d="M 65,43 L 74,43 A 1,1 0 0,1 75,44 L 73,52 A 1,1 0 0,1 72,53 L 63,53 A 1,1 0 0,1 62,52 L 64,44 A 1,1 0 0,1 65,43" fill="#ff3d00" opacity="0.85" />
      <path d="M 40,72 Q 50,78 60,72" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  'svg:headphones': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-music" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#aa00ff" />
          <stop offset="100%" stopColor="#3d0066" />
        </radialGradient>
        <linearGradient id="glow-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#00b386" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-music)" />
      <path d="M 28,45 A 22,22 0 0,1 72,45" fill="none" stroke="url(#glow-green)" strokeWidth="6" />
      <circle cx="50" cy="52" r="18" fill="#ffffff" opacity="0.9" />
      <rect x="40" y="48" width="8" height="6" rx="2" fill="#3d0066" />
      <rect x="52" y="48" width="8" height="6" rx="2" fill="#3d0066" />
      <line x1="48" y1="51" x2="52" y2="51" stroke="#3d0066" strokeWidth="2" />
      <rect x="22" y="42" width="8" height="20" rx="4" fill="url(#glow-green)" />
      <rect x="70" y="42" width="8" height="20" rx="4" fill="url(#glow-green)" />
    </svg>
  ),
  'svg:monster': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-monster" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff00cc" />
          <stop offset="100%" stopColor="#4a0082" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-monster)" />
      <path d="M 35,30 Q 30,12 22,18 Q 30,25 35,32 Z" fill="#ffffff" />
      <path d="M 65,30 Q 70,12 78,18 Q 70,25 65,32 Z" fill="#ffffff" />
      <ellipse cx="50" cy="58" rx="28" ry="24" fill="#ffffff" opacity="0.95" />
      <circle cx="50" cy="52" r="11" fill="#111" />
      <circle cx="50" cy="52" r="10" fill="#3a86ff" />
      <circle cx="48" cy="50" r="4" fill="#ffffff" />
      <path d="M 40,68 Q 50,78 60,68" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      <polygon points="48,71 52,71 50,75" fill="#ffffff" />
    </svg>
  ),
  'svg:crown': () => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-royal" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#00b0ff" />
          <stop offset="100%" stopColor="#004d40" />
        </radialGradient>
        <linearGradient id="gold-crown" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#ffb300" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#bg-royal)" />
      <path d="M 20,68 L 80,68 L 76,36 L 62,50 L 50,30 L 38,50 L 24,36 Z" fill="url(#gold-crown)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="30" r="3" fill="#d500f9" />
      <circle cx="24" cy="36" r="3" fill="#ff1744" />
      <circle cx="76" cy="36" r="3" fill="#ff1744" />
      <rect x="35" y="60" width="30" height="4" rx="2" fill="#ffffff" opacity="0.6" />
    </svg>
  )
};

export const AVATAR_OPTIONS = [
  { id: 'svg:smile', label: 'Smile' },
  { id: 'svg:astronaut', label: 'Astro' },
  { id: 'svg:cool', label: 'Cool' },
  { id: 'svg:headphones', label: 'Music' },
  { id: 'svg:monster', label: 'Kids' },
  { id: 'svg:crown', label: 'Crown' },
  { id: 'custom', label: 'Text Initials' }
];

const renderAvatar = (seed: string, isKids?: boolean) => {
  if (seed && PRESET_AVATARS[seed]) {
    return PRESET_AVATARS[seed]();
  }
  const initials = seed ? seed.slice(0, 2).toUpperCase() : '??';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '24px',
        background: isKids
          ? 'linear-gradient(135deg, #3a8dff 0%, #002280 100%)'
          : 'linear-gradient(135deg, #ff4c4c 0%, #66000c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '38px',
        fontWeight: 800,
        letterSpacing: '1px',
        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.2)'
      }}
    >
      {initials}
    </div>
  );
};

function ProfileSelectionScreen() {
  const profiles = useAppStore((state) => state.profiles);
  const selectProfile = useAppStore((state) => state.selectProfile);
  const addProfile = useAppStore((state) => state.addProfile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const removeProfile = useAppStore((state) => state.removeProfile);
  const bootstrapHomeData = useAppStore((state) => state.bootstrapHomeData);
  const leaveProfileSelection = useAppStore((state) => state.leaveProfileSelection);

  // Focus and Selection States
  const [isEditMode, setIsEditMode] = useState(false);
  const [focusArea, setFocusArea] = useState<'grid' | 'manage'>('grid');
  const [focusIndex, setFocusIndex] = useState(0); // 0 to profiles.length (profiles.length is the Add card)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Form Modal States
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formIsKids, setFormIsKids] = useState(false);
  const [formPin, setFormPin] = useState('');
  const [formFocusIndex, setFormFocusIndex] = useState(0); // 0: Name, 1: Avatar, 2: Kids, 3: PIN Button, 4: Save, 5: Cancel, 6: Delete
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingInitials, setIsEditingInitials] = useState(false);

  // PIN Dialog States (Setting PIN, Unlocking Profile)
  const [pinMode, setPinMode] = useState<'set' | 'unlock'>('set');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinFocusIndex, setPinFocusIndex] = useState(0); // 0-3: slots, 4: Bottom Save/Unlock, 5: Bottom Cancel
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinTargetProfile, setPinTargetProfile] = useState<UserProfile | null>(null);
  const [onPinSuccess, setOnPinSuccess] = useState<(() => void) | null>(null);

  // Input Refs for OSK focus
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const gridRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const manageButtonRef = useRef<HTMLButtonElement | null>(null);
  const formRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 1. Activate profile
  const activateProfile = (profileId: string) => {
    selectProfile(profileId);
    void bootstrapHomeData();
  };

  // 2. Open Profile Edit/Add Modal
  const openAddProfileModal = () => {
    setEditingProfile(null);
    setFormName('');
    setFormAvatar('');
    setFormIsKids(false);
    setFormPin('');
    setFormFocusIndex(0);
    setIsEditingName(false);
    setIsEditingInitials(false);
    setActiveModal('profile-form');
  };

  const openEditProfileModal = (profile: UserProfile) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormAvatar(profile.avatarSeed);
    setFormIsKids(!!profile.isKids);
    setFormPin(profile.pinLock || '');
    setFormFocusIndex(0);
    setIsEditingName(false);
    setIsEditingInitials(false);
    setActiveModal('profile-form');
  };

  // 3. Open PIN Setter
  const openPinSetter = () => {
    setPinMode('set');
    setPinDigits(['', '', '', '']);
    setPinFocusIndex(0);
    setPinError(null);
    setActiveModal('pin-dialog');
  };

  // 4. Main grid navigation keyboard handler
  useEffect(() => {
    if (activeModal !== null) return;

    const handleMainKeyDown = (event: KeyboardEvent) => {
      if (focusArea === 'grid') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setFocusIndex((prev) => Math.max(0, prev - 1));
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          setFocusIndex((prev) => Math.min(profiles.length, prev + 1));
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setFocusArea('manage');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (focusIndex === profiles.length) {
            // Add Profile card
            openAddProfileModal();
          } else {
            // Select or Edit Profile
            const profile = profiles[focusIndex];
            if (profile) {
              if (isEditMode) {
                if (profile.pinLock) {
                  // Prompt PIN before editing locked profile
                  setPinMode('unlock');
                  setPinDigits(['', '', '', '']);
                  setPinFocusIndex(0);
                  setPinError(null);
                  setPinTargetProfile(profile);
                  setOnPinSuccess(() => () => openEditProfileModal(profile));
                  setActiveModal('pin-unlock');
                } else {
                  openEditProfileModal(profile);
                }
              } else {
                if (profile.pinLock) {
                  // Prompt PIN before activating
                  setPinMode('unlock');
                  setPinDigits(['', '', '', '']);
                  setPinFocusIndex(0);
                  setPinError(null);
                  setPinTargetProfile(profile);
                  setOnPinSuccess(() => () => activateProfile(profile.id));
                  setActiveModal('pin-unlock');
                } else {
                  activateProfile(profile.id);
                }
              }
            }
          }
        } else if (
          event.key === 'Backspace' ||
          event.key === 'Escape' ||
          event.key === 'GoBack' ||
          event.keyCode === 461
        ) {
          event.preventDefault();
          leaveProfileSelection();
        }
      } else if (focusArea === 'manage') {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setFocusArea('grid');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          setIsEditMode((prev) => !prev);
          setFocusArea('grid');
          setFocusIndex(0);
        } else if (
          event.key === 'Backspace' ||
          event.key === 'Escape' ||
          event.key === 'GoBack' ||
          event.keyCode === 461
        ) {
          event.preventDefault();
          leaveProfileSelection();
        }
      }
    };

    window.addEventListener('keydown', handleMainKeyDown);
    return () => window.removeEventListener('keydown', handleMainKeyDown);
  }, [focusArea, focusIndex, profiles, isEditMode, activeModal]);

  // Focus correct element on main screen
  useEffect(() => {
    if (activeModal !== null) return;

    if (focusArea === 'grid') {
      const id = focusIndex === profiles.length ? 'add' : profiles[focusIndex]?.id;
      const el = gridRefs.current[id];
      if (el) el.focus();
    } else {
      manageButtonRef.current?.focus();
    }
  }, [focusArea, focusIndex, profiles, activeModal]);

  // 5. Form Modal keydown handler
  useEffect(() => {
    if (activeModal !== 'profile-form') return;

    const maxFocusIndex = editingProfile && editingProfile.id !== 'primary' ? 6 : 5;

    const handleFormKeyDown = (event: KeyboardEvent) => {
      if (isEditingName || isEditingInitials) {
        if (event.key === 'Enter') {
          event.preventDefault();
          setIsEditingName(false);
          setIsEditingInitials(false);
        } else if (
          event.key === 'Escape' ||
          event.key === 'GoBack' ||
          event.keyCode === 461
        ) {
          event.preventDefault();
          setIsEditingName(false);
          setIsEditingInitials(false);
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFormFocusIndex((prev) => {
          if (prev < 4) return prev + 1;
          return prev; // Stay on actions row
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFormFocusIndex((prev) => {
          if (prev >= 4) return 3; // Go back to PIN button
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
        } else if (formFocusIndex >= 4) {
          event.preventDefault();
          setFormFocusIndex((prev) => Math.max(4, prev - 1));
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
        } else if (formFocusIndex >= 4) {
          event.preventDefault();
          setFormFocusIndex((prev) => Math.min(maxFocusIndex, prev + 1));
        }
      } else if (event.key === 'Enter') {
        // Form field triggers
        if (formFocusIndex === 0) {
          event.preventDefault();
          setIsEditingName(true);
        } else if (formFocusIndex === 1) {
          event.preventDefault();
          if (!formAvatar.startsWith('svg:')) {
            setIsEditingInitials(true);
          } else {
            // Confirm SVG preset and advance focus to Kids Profile
            setFormFocusIndex(2);
          }
        } else if (formFocusIndex === 2) {
          // Toggle Kids
          event.preventDefault();
          setFormIsKids((prev) => !prev);
        } else if (formFocusIndex === 3) {
          // Toggle/Change PIN
          event.preventDefault();
          if (formPin) {
            // If already set, clicking can clear or reset it. Let's toggle off directly.
            setFormPin('');
          } else {
            openPinSetter();
          }
        } else if (formFocusIndex === 4) {
          // Save
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
            addProfile(formName, formAvatar, formIsKids, formPin);
          }
          setActiveModal(null);
          setIsEditMode(false);
          setFocusArea('grid');
          setFocusIndex(0);
        } else if (formFocusIndex === 5) {
          // Cancel
          event.preventDefault();
          setActiveModal(null);
        } else if (formFocusIndex === 6) {
          // Delete
          event.preventDefault();
          if (editingProfile && editingProfile.id !== 'primary') {
            removeProfile(editingProfile.id);
            setActiveModal(null);
            setIsEditMode(false);
            setFocusArea('grid');
            setFocusIndex(0);
          }
        }
      } else if (
        event.key === 'Backspace' ||
        event.key === 'Escape' ||
        event.key === 'GoBack' ||
        event.keyCode === 461
      ) {
        // If focused on text inputs, let standard keyboard handle backspace/char delete
        if (formFocusIndex !== 0 && formFocusIndex !== 1) {
          event.preventDefault();
          setActiveModal(null);
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown);
    return () => window.removeEventListener('keydown', handleFormKeyDown);
  }, [formFocusIndex, formName, formAvatar, formIsKids, formPin, editingProfile, activeModal, isEditingName, isEditingInitials]);

  // Focus correct element in Profile Form
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

  // 6. PIN Dialog & Unlock keydown handler
  useEffect(() => {
    if (activeModal !== 'pin-dialog' && activeModal !== 'pin-unlock') return;

    const handlePinKeyDown = (event: KeyboardEvent) => {
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

      // Navigation Keys
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (pinFocusIndex > 0 && pinFocusIndex <= 3) {
          setPinFocusIndex(pinFocusIndex - 1);
        } else if (pinFocusIndex === 0) {
          // Escape left to Save/Unlock Button
          setPinFocusIndex(4);
        } else if (pinFocusIndex === 5) {
          // Cancel to Save/Unlock Button
          setPinFocusIndex(4);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (pinFocusIndex >= 0 && pinFocusIndex < 3) {
          setPinFocusIndex(pinFocusIndex + 1);
        } else if (pinFocusIndex === 3) {
          // Escape right to Cancel Button
          setPinFocusIndex(5);
        } else if (pinFocusIndex === 4) {
          // Save/Unlock to Cancel Button
          setPinFocusIndex(5);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (pinFocusIndex === 4) {
          // Save/Unlock back to digit slot 0
          setPinFocusIndex(0);
        } else if (pinFocusIndex === 5) {
          // Cancel back to digit slot 3
          setPinFocusIndex(3);
        } else if (pinFocusIndex >= 0 && pinFocusIndex <= 3) {
          // Increment digit value
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
          // Decrement digit value
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
          // Submit action
          const pinString = pinDigits.join('');
          if (pinString.length !== 4) {
            setPinError('Please enter a 4-digit code');
            return;
          }

          if (activeModal === 'pin-unlock') {
            // Verify unlock
            if (pinTargetProfile && pinTargetProfile.pinLock === pinString) {
              setActiveModal(null);
              if (onPinSuccess) onPinSuccess();
            } else {
              setPinError('Incorrect Passcode. Try again.');
              setPinDigits(['', '', '', '']);
              setPinFocusIndex(0);
            }
          } else {
            // Setting PIN
            setFormPin(pinString);
            setActiveModal('profile-form');
          }
        } else if (pinFocusIndex === 5) {
          // Cancel
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

  // Focus correct element in PIN dialogue
  useEffect(() => {
    if (activeModal !== 'pin-dialog' && activeModal !== 'pin-unlock') return;

    const el = pinRefs.current[pinFocusIndex.toString()];
    if (el) el.focus();
  }, [pinFocusIndex, activeModal]);

  return (
    <main
      aria-label="Profile selection"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top center, rgba(229, 9, 20, 0.15) 0%, rgba(8, 10, 16, 0) 50%), linear-gradient(180deg, #07090e 0%, #0f121d 100%)',
        color: '#ffffff',
        fontFamily: 'Outfit, Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '1480px',
          padding: '72px 84px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '36px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px'
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#ff2438',
              fontSize: '14px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '4px'
            }}
          >
            Profiles
          </p>
          <h1
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '60px',
              fontWeight: 800,
              letterSpacing: '-1px',
              lineHeight: 1
            }}
          >
            {isEditMode ? 'Manage Profiles' : "Who's watching?"}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              maxWidth: '760px',
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '20px',
              lineHeight: 1.5
            }}
          >
            {isEditMode
              ? 'Select a profile to customize its name, avatar, or passcode.'
              : 'Choose a profile before entering the Smartifly TV shell.'}
          </p>
        </div>

        <div
          role="list"
          aria-label="Available profiles"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            margin: '24px 0'
          }}
        >
          {profiles.map((profile, index) => {
            const isSomeCardFocused = activeModal === null && focusArea === 'grid';
            const isThisCardFocused = isSomeCardFocused && focusIndex === index;
            const cardOpacity = isSomeCardFocused ? (isThisCardFocused ? 1 : 0.45) : 0.85;

            return (
              <button
                key={profile.id}
                type="button"
                role="listitem"
                ref={(el) => {
                  gridRefs.current[profile.id] = el;
                }}
                onMouseEnter={() => {
                  if (activeModal === null) {
                    setFocusArea('grid');
                    setFocusIndex(index);
                  }
                }}
                onClick={() => {
                  if (activeModal !== null) return;
                  if (isEditMode) {
                    if (profile.pinLock) {
                      setPinMode('unlock');
                      setPinDigits(['', '', '', '']);
                      setPinFocusIndex(0);
                      setPinError(null);
                      setPinTargetProfile(profile);
                      setOnPinSuccess(() => () => openEditProfileModal(profile));
                      setActiveModal('pin-unlock');
                    } else {
                      openEditProfileModal(profile);
                    }
                  } else {
                    if (profile.pinLock) {
                      setPinMode('unlock');
                      setPinDigits(['', '', '', '']);
                      setPinFocusIndex(0);
                      setPinError(null);
                      setPinTargetProfile(profile);
                      setOnPinSuccess(() => () => activateProfile(profile.id));
                      setActiveModal('pin-unlock');
                    } else {
                      activateProfile(profile.id);
                    }
                  }
                }}
                style={{
                  width: '240px',
                  minHeight: '320px',
                  borderRadius: '24px',
                  border: isThisCardFocused ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.06)',
                  background: isThisCardFocused
                    ? 'linear-gradient(180deg, rgba(30, 37, 54, 0.95) 0%, rgba(15, 18, 26, 0.98) 100%)'
                    : 'linear-gradient(180deg, rgba(20, 24, 34, 0.6) 0%, rgba(10, 12, 18, 0.8) 100%)',
                  boxShadow: isThisCardFocused ? '0 10px 24px rgba(0, 0, 0, 0.5)' : 'none',
                  color: '#ffffff',
                  padding: '28px 20px 24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  outline: 'none',
                  opacity: cardOpacity,
                  transform: isThisCardFocused ? 'translate3d(0, -8px, 0) scale(1.05)' : 'translate3d(0, 0, 0) scale(1)',
                  transition: 'transform 180ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 180ms ease, border-color 180ms ease',
                  position: 'relative'
                }}
              >
                {/* Glossy Overlay for focused card */}
                {isThisCardFocused && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%)',
                      pointerEvents: 'none',
                      zIndex: 2
                    }}
                  />
                )}

                {/* Avatar rounded square container */}
                <div
                  style={{
                    width: '130px',
                    height: '130px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: isThisCardFocused ? '0 8px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.2)',
                    transition: 'box-shadow 180ms ease'
                  }}
                >
                  {renderAvatar(profile.avatarSeed, profile.isKids)}

                  {/* Edit Pencil Overlay */}
                  {isEditMode && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        zIndex: 3
                      }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info & lock indicator */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <strong
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: isThisCardFocused ? '#ffffff' : 'rgba(255,255,255,0.85)'
                    }}
                  >
                    {profile.pinLock && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'rgba(255,255,255,0.6)' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {profile.name}
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontSize: '15px'
                    }}
                  >
                    {profile.isKids ? 'Kids Profile' : 'Primary Profile'}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Add Profile Card */}
          <button
            type="button"
            ref={(el) => {
              gridRefs.current['add'] = el;
            }}
            onMouseEnter={() => {
              if (activeModal === null) {
                setFocusArea('grid');
                setFocusIndex(profiles.length);
              }
            }}
            onClick={() => {
              if (activeModal === null) openAddProfileModal();
            }}
            style={{
              width: '240px',
              minHeight: '320px',
              borderRadius: '24px',
              border:
                activeModal === null && focusArea === 'grid' && focusIndex === profiles.length
                  ? '3px solid #ffffff'
                  : '2px dashed rgba(255,255,255,0.15)',
              background:
                activeModal === null && focusArea === 'grid' && focusIndex === profiles.length
                  ? 'rgba(255,255,255,0.06)'
                  : 'transparent',
              color: '#ffffff',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              cursor: 'pointer',
              outline: 'none',
              opacity: activeModal === null && focusArea === 'grid' ? (focusIndex === profiles.length ? 1 : 0.45) : 0.85,
              transform:
                activeModal === null && focusArea === 'grid' && focusIndex === profiles.length
                  ? 'translate3d(0, -8px, 0) scale(1.05)'
                  : 'translate3d(0, 0, 0) scale(1)',
              transition: 'transform 180ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 180ms ease, border-color 180ms ease'
            }}
          >
            {/* Glossy Overlay for Add Card when focused */}
            {activeModal === null && focusArea === 'grid' && focusIndex === profiles.length && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              />
            )}
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '999px',
                border: '2.5px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <strong style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>Add Profile</strong>
          </button>
        </div>

        {/* Manage Button */}
        <button
          ref={manageButtonRef}
          type="button"
          onMouseEnter={() => {
            if (activeModal === null) setFocusArea('manage');
          }}
          onClick={() => setIsEditMode((prev) => !prev)}
          style={{
            marginTop: '12px',
            minWidth: '220px',
            height: '60px',
            borderRadius: '16px',
            border: 'none',
            background:
              activeModal === null && focusArea === 'manage'
                ? '#ffffff'
                : 'rgba(255,255,255,0.06)',
            color: activeModal === null && focusArea === 'manage' ? '#07090e' : '#ffffff',
            fontSize: '18px',
            fontWeight: 800,
            cursor: 'pointer',
            outline: 'none',
            transition: 'background-color 140ms ease, color 140ms ease, transform 140ms ease',
            transform: activeModal === null && focusArea === 'manage' ? 'translate3d(0, 0, 0) scale(1.05)' : 'translate3d(0, 0, 0) scale(1)'
          }}
        >
          {isEditMode ? 'Done' : 'Manage Profiles'}
        </button>
      </section>

      {/* Profile Form Modal (Add/Edit) */}
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
            background: 'rgba(5, 7, 12, 0.96)'
          }}
        >
          <div
            style={{
              width: '580px',
              padding: '40px',
              borderRadius: '32px',
              background: 'linear-gradient(180deg, #121622 0%, #0a0d14 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxSizing: 'border-box'
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#ff2438', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Profile Editor
              </p>
              <h2 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800, color: '#ffffff' }}>
                {editingProfile ? 'Edit Profile' : 'Create Profile'}
              </h2>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Profile Name</label>
                {isEditingName ? (
                  <input
                    ref={(el) => {
                      nameInputRef.current = el;
                    }}
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    placeholder="Enter name..."
                    style={{
                      width: '100%',
                      height: '56px',
                      borderRadius: '14px',
                      border: '2px solid #ff2438',
                      background: '#0d1017',
                      color: '#ffffff',
                      padding: '0 18px',
                      fontSize: '18px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <button
                    ref={(el) => {
                      formRefs.current['0'] = el;
                    }}
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    style={{
                      width: '100%',
                      height: '56px',
                      borderRadius: '14px',
                      border: formFocusIndex === 0 ? '2px solid #ff2438' : '2px solid rgba(255,255,255,0.08)',
                      background: '#0d1017',
                      color: formName ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      padding: '0 18px',
                      fontSize: '18px',
                      textAlign: 'left',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{formName || 'Enter name...'}</span>
                    {formFocusIndex === 0 && (
                      <span style={{ fontSize: '12px', color: '#ff2438', fontWeight: 600 }}>
                        Press Enter to Type
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Avatar Selection Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Profile Avatar</label>
                
                {/* Horizontal row of SVG options */}
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
                
                {/* Text input, only active when custom initials is selected */}
                {!formAvatar.startsWith('svg:') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {isEditingInitials ? (
                      <input
                        ref={(el) => {
                          avatarInputRef.current = el;
                        }}
                        type="text"
                        maxLength={2}
                        value={formAvatar}
                        onChange={(e) => setFormAvatar(e.target.value.toUpperCase())}
                        onBlur={() => setIsEditingInitials(false)}
                        placeholder="Enter initials (e.g. ME)"
                        style={{
                          width: '100%',
                          height: '46px',
                          borderRadius: '10px',
                          border: '2px solid #ff2438',
                          background: '#0d1017',
                          color: '#ffffff',
                          padding: '0 14px',
                          fontSize: '16px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingInitials(true)}
                        style={{
                          width: '100%',
                          height: '46px',
                          borderRadius: '10px',
                          border: formFocusIndex === 1 ? '2px solid #ff2438' : '1px solid rgba(255,255,255,0.1)',
                          background: '#0d1017',
                          color: formAvatar ? '#ffffff' : 'rgba(255,255,255,0.4)',
                          padding: '0 14px',
                          fontSize: '16px',
                          textAlign: 'left',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{formAvatar || 'Enter initials (e.g. ME)'}</span>
                        {formFocusIndex === 1 && (
                          <span style={{ fontSize: '11px', color: '#ff2438', fontWeight: 600 }}>
                            Press Enter to Type Initials
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
                
                {/* Helper instruction text */}
                {formFocusIndex === 1 && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#ff2438', fontWeight: 600, textAlign: 'center' }}>
                    Use Arrow Left / Right to change avatar
                  </p>
                )}
              </div>

              {/* Kids Toggle */}
              <button
                ref={(el) => {
                  formRefs.current['2'] = el;
                }}
                type="button"
                onClick={() => setFormIsKids((prev) => !prev)}
                style={{
                  height: '56px',
                  width: '100%',
                  borderRadius: '14px',
                  border: formFocusIndex === 2 ? '2px solid #ff2438' : '1px solid rgba(255,255,255,0.08)',
                  background: formFocusIndex === 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
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
                <span style={{ color: formIsKids ? '#55a8ff' : 'rgba(255,255,255,0.3)' }}>
                  {formIsKids ? 'Enabled' : 'Disabled'}
                </span>
              </button>

              {/* PIN lock setting */}
              <button
                ref={(el) => {
                  formRefs.current['3'] = el;
                }}
                type="button"
                onClick={() => {
                  if (formPin) {
                    setFormPin('');
                  } else {
                    openPinSetter();
                  }
                }}
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

            {/* Action Row */}
            <div style={{ display: 'grid', gridTemplateColumns: editingProfile && editingProfile.id !== 'primary' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <button
                ref={(el) => {
                  formRefs.current['4'] = el;
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
                  setIsEditMode(false);
                  setFocusArea('grid');
                  setFocusIndex(0);
                }}
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(180deg, #ff2438 0%, #c40c18 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transform: formFocusIndex === 4 ? 'translate3d(0, 0, 0) scale(1.02)' : 'none',
                  boxShadow: formFocusIndex === 4 ? '0 0 0 3px #ffffff' : 'none'
                }}
              >
                Save
              </button>

              <button
                ref={(el) => {
                  formRefs.current['5'] = el;
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
                  transform: formFocusIndex === 5 ? 'translate3d(0, 0, 0) scale(1.02)' : 'none',
                  boxShadow: formFocusIndex === 5 ? '0 0 0 3px #ffffff' : 'none'
                }}
              >
                Cancel
              </button>

              {editingProfile && editingProfile.id !== 'primary' && (
                <button
                  ref={(el) => {
                    formRefs.current['6'] = el;
                  }}
                  type="button"
                  onClick={() => {
                    removeProfile(editingProfile.id);
                    setActiveModal(null);
                    setIsEditMode(false);
                    setFocusArea('grid');
                    setFocusIndex(0);
                  }}
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: '#4a121c',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 800,
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transform: formFocusIndex === 6 ? 'translate3d(0, 0, 0) scale(1.02)' : 'none',
                    boxShadow: formFocusIndex === 6 ? '0 0 0 3px #ffffff' : 'none'
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
            background: 'rgba(5, 7, 10, 0.96)'
          }}
        >
          <div
            style={{
              width: '500px',
              padding: '40px',
              borderRadius: '28px',
              background: '#0c0f16',
              border: '1px solid rgba(255,255,255,0.08)',
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

            {/* Digits Display */}
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
                      transition: 'border-color 100ms ease, background-color 100ms ease'
                    }}
                  >
                    {isFilled ? (activeModal === 'pin-unlock' ? '●' : digit) : ''}
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
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
                  background: 'linear-gradient(180deg, #ff2438 0%, #d50d1a 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  transform: pinFocusIndex === 4 ? 'translate3d(0, 0, 0) scale(1.02)' : 'none',
                  boxShadow: pinFocusIndex === 4 ? '0 0 0 3px #ffffff' : 'none',
                  transition: 'transform 100ms ease'
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
                  transform: pinFocusIndex === 5 ? 'translate3d(0, 0, 0) scale(1.02)' : 'none',
                  boxShadow: pinFocusIndex === 5 ? '0 0 0 3px #ffffff' : 'none',
                  transition: 'transform 100ms ease'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProfileSelectionScreen;

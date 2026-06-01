import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Smile,
  Tv,
  Film,
  Clapperboard,
  Heart,
  Star,
  Plus,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import { Focusable } from "../../components/tv/Focusable";
import { useFocus } from "../../providers/useFocus";
import { useTvBack } from "../../hooks/useTvBack";
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATARS,
  type UserProfile,
} from "../../storage/profileStorage";
import { useProfileStore } from "../../store/profileStore";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import styles from "./Profiles.module.css";

// Lucide icon mapping
export const AVATAR_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  smile: Smile,
  tv: Tv,
  film: Film,
  clapperboard: Clapperboard,
  heart: Heart,
  star: Star,
};

interface ProfilesProps {
  onSelectProfile: () => void;
}

export const Profiles: React.FC<ProfilesProps> = ({ onSelectProfile }) => {
  const {
    profiles,
    isEditMode,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setEditMode,
    loadProfiles,
  } = useProfileStore();

  const { setFocus, setFocusScope, focusedId } = useFocus();

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  
  // Temporary form values
  const [tempName, setTempName] = useState("");
  const [tempColor, setTempColor] = useState(DEFAULT_AVATAR_COLORS[0]);
  const [tempIcon, setTempIcon] = useState(DEFAULT_AVATARS[0]);

  const [atmosphereColor, setAtmosphereColor] = useState<string>("transparent");

  // Keep track of which element was focused before opening the modal
  const preModalFocusedIdRef = useRef<string | null>(null);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Handle D-pad Back action
  useTvBack(() => {
    if (isKeyboardOpen) {
      setIsKeyboardOpen(false);
      return;
    }
    if (isModalOpen) {
      closeModal();
      return;
    }
    if (isEditMode) {
      setEditMode(false);
      return;
    }
  });

  // Manage focus scope
  useEffect(() => {
    if (isKeyboardOpen) {
      // TvKeyboard has its own internal focus scope trap
      return;
    }

    if (isModalOpen) {
      setFocusScope(["prof-modal-"], "prof-modal-name");
      setFocus("prof-modal-name");
    } else {
      setFocusScope(["profile-", "prof-action-"], "profile-card-0");
      
      // If we closed the modal, restore focus to the item we were on before
      if (preModalFocusedIdRef.current) {
        setFocus(preModalFocusedIdRef.current);
        preModalFocusedIdRef.current = null;
      } else {
        setFocus("profile-card-0");
      }
    }

    return () => setFocusScope(null);
  }, [isModalOpen, isKeyboardOpen, setFocus, setFocusScope]);

  // Close editing modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  // Open modal for a new profile
  const handleOpenAddProfile = () => {
    preModalFocusedIdRef.current = focusedId;
    setEditingProfile(null);
    setTempName("");
    setTempColor(DEFAULT_AVATAR_COLORS[profiles.length % DEFAULT_AVATAR_COLORS.length]);
    setTempIcon(DEFAULT_AVATARS[profiles.length % DEFAULT_AVATARS.length]);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing profile
  const handleOpenEditProfile = (profile: UserProfile) => {
    preModalFocusedIdRef.current = focusedId;
    setEditingProfile(profile);
    setTempName(profile.name);
    setTempColor(profile.avatarColor);
    setTempIcon(profile.avatarIcon);
    setIsModalOpen(true);
  };

  // Save changes
  const handleSaveProfile = () => {
    const trimmed = tempName.trim();
    const finalName = trimmed || (editingProfile ? editingProfile.name : "Viewer");

    if (editingProfile) {
      // Update
      updateProfile({
        ...editingProfile,
        name: finalName,
        avatarColor: tempColor,
        avatarIcon: tempIcon,
      });
    } else {
      // Create
      createProfile(finalName, tempColor, tempIcon);
    }
    
    closeModal();
  };

  // Delete profile
  const handleDeleteProfile = () => {
    if (!editingProfile) return;
    deleteProfile(editingProfile.id);
    closeModal();
  };

  // Triggered when a card is entered
  const handleCardEnter = (profile: UserProfile) => {
    if (isEditMode) {
      handleOpenEditProfile(profile);
    } else {
      selectProfile(profile);
      onSelectProfile();
    }
  };

  // Clean ambient vibe matching profile color
  const updateVibeColor = useCallback((color: string) => {
    setAtmosphereColor((current) => (current === color ? current : color));
  }, []);

  return (
    <div 
      className={styles.container}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, ${atmosphereColor}15 0%, #08090c 100%)`
      }}
    >
      <div 
        className={styles.atmosphere} 
        style={{
          background: `radial-gradient(circle at 50% 45%, ${atmosphereColor}22 0%, transparent 60%)`
        }} 
      />

      <div className={styles.content}>
        <h1 className={styles.title}>
          {isEditMode ? "Manage Profiles" : "Who's watching?"}
        </h1>

        <div className={styles.profileRow}>
          {profiles.map((profile, index) => {
            const Icon = AVATAR_ICONS[profile.avatarIcon] || Smile;
            return (
              <Focusable
                key={profile.id}
                id={`profile-card-${index}`}
                onEnter={() => handleCardEnter(profile)}
                onFocus={() => updateVibeColor(profile.avatarColor)}
                className={`${styles.profileCard} ${isEditMode ? styles.isEditing : ""}`}
                style={{ "--glow-color": `${profile.avatarColor}66` } as React.CSSProperties}
                variant="none"
              >
                <div className={styles.profileCardInner}>
                  <div 
                    className={styles.avatarContainer}
                    style={{ backgroundColor: profile.avatarColor }}
                  >
                    <div className={styles.avatar}>
                      <Icon className={styles.avatarIcon} />
                    </div>

                    {isEditMode && (
                      <div className={styles.editBadge}>
                        <Edit2 className={styles.editBadgeIcon} />
                      </div>
                    )}
                  </div>
                  <span className={styles.profileName}>{profile.name}</span>
                </div>
              </Focusable>
            );
          })}

          {/* Add Profile Card Slot (Limit to max 5 profiles) */}
          {profiles.length < 5 && (
            <Focusable
              id={`profile-card-add`}
              onEnter={handleOpenAddProfile}
              onFocus={() => updateVibeColor("#718096")}
              className={styles.profileCard}
              variant="none"
            >
              <div className={styles.profileCardInner}>
                <div className={`${styles.avatarContainer} ${styles.addAvatar}`}>
                  <Plus className={styles.avatarIcon} />
                </div>
                <span className={styles.profileName}>Add Profile</span>
              </div>
            </Focusable>
          )}
        </div>

        <div className={styles.actionsBar}>
          <Focusable
            id="prof-action-manage"
            onEnter={() => setEditMode(!isEditMode)}
            className={`${styles.manageBtn} ${isEditMode ? styles.manageBtnActive : ""}`}
          >
            {isEditMode ? "Done" : "Manage Profiles"}
          </Focusable>
        </div>
      </div>

      {/* Profile Creation/Editing Form Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {editingProfile ? "Edit Profile" : "Add Profile"}
            </h2>

            <div className={styles.modalForm}>
              {/* Profile Name Input Field */}
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Profile Name</span>
                <Focusable
                  id="prof-modal-name"
                  onEnter={() => setIsKeyboardOpen(true)}
                  className={styles.inputField}
                >
                  <span>{tempName || "Enter profile name"}</span>
                  <Edit2 size={16} className="text-secondary" />
                </Focusable>
              </div>

              {/* Color Presets Picker */}
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Choose Theme Color</span>
                <div className={styles.colorPickerRow}>
                  {DEFAULT_AVATAR_COLORS.map((color, idx) => (
                    <Focusable
                      key={color}
                      id={`prof-modal-color-${idx}`}
                      onEnter={() => setTempColor(color)}
                      className={`${styles.colorCircle} ${
                        tempColor === color ? styles.colorCircleSelected : ""
                      }`}
                      style={{ backgroundColor: color, color: color }}
                    >
                      {tempColor === color && (
                        <Check className={styles.checkIcon} />
                      )}
                    </Focusable>
                  ))}
                </div>
              </div>

              {/* Icon Presets Picker */}
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Choose Avatar Icon</span>
                <div className={styles.iconPickerRow}>
                  {DEFAULT_AVATARS.map((avatar, idx) => {
                    const AvatarIcon = AVATAR_ICONS[avatar] || Smile;
                    return (
                      <Focusable
                        key={avatar}
                        id={`prof-modal-icon-${idx}`}
                        onEnter={() => setTempIcon(avatar)}
                        className={`${styles.iconSelector} ${
                          tempIcon === avatar ? styles.iconSelectorSelected : ""
                        }`}
                      >
                        <AvatarIcon className={styles.iconSelectorIcon} />
                      </Focusable>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className={styles.modalButtons}>
                <Focusable
                  id="prof-modal-save"
                  onEnter={handleSaveProfile}
                  className={`${styles.modalBtn} ${styles.saveBtn}`}
                >
                  Save
                </Focusable>

                <Focusable
                  id="prof-modal-cancel"
                  onEnter={closeModal}
                  className={`${styles.modalBtn} ${styles.cancelBtn}`}
                >
                  Cancel
                </Focusable>

                {editingProfile && profiles.length > 1 && (
                  <Focusable
                    id="prof-modal-delete"
                    onEnter={handleDeleteProfile}
                    className={`${styles.modalBtn} ${styles.deleteBtn}`}
                  >
                    <Trash2 size={16} style={{ marginRight: 8, display: "inline" }} />
                    Delete
                  </Focusable>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TvKeyboard Form Popup */}
      {isKeyboardOpen && (
        <div className={styles.keyboardOverlay}>
          <TvKeyboard
            title={editingProfile ? "Edit Profile Name" : "Profile Name"}
            placeholder="Type profile name"
            value={tempName}
            maxLength={12}
            onSubmit={(val) => {
              setTempName(val);
              setIsKeyboardOpen(false);
            }}
            onClose={() => setIsKeyboardOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

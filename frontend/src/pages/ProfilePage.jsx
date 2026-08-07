import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Camera,
  Check,
  X,
  Sparkles,
  Lock,
  Flame,
  Dumbbell,
  Utensils,
  Calendar,
  Activity,
  History,
  Mail,
  Circle
} from 'lucide-react';
import { calculateTodayNutrition } from '../utils/nutritionCalculator';
import { calculateMacroTargets } from '../utils/macroCalculator';
import Card from '../components/common/Card';
import CircularProgress from '../components/common/CircularProgress';
import "../components/dashboard/Dashboard.css";

const ProfilePage = () => {
  const { user, updateUserProfileState, authFetch, API_BASE_URL, token } = useAuth();
  const navigate = useNavigate();

  const getAvatarUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const serverRoot = API_BASE_URL && API_BASE_URL.endsWith('/api') 
      ? API_BASE_URL.slice(0, -4) 
      : (API_BASE_URL || 'http://localhost:5001');
    return `${serverRoot}${path}`;
  };

  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [fitnessGoal, setFitnessGoal] = useState(user?.fitnessGoal || 'Gain Muscle');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || user?.activityLevel || 'Intermediate');
  const [dietPreference, setDietPreference] = useState(user?.dietPreference || 'Non-Veg');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dailyCalories, setDailyCalories] = useState(2200);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setToast('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setPwdSaving(true);
    try {
      const data = await authFetch('/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (data.success) {
        setToast('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setToast(''), 3000);
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (err) {
      setError('Error changing password');
    } finally {
      setPwdSaving(false);
    }
  };

  // Fetch daily target calories from backend single source of truth
  useEffect(() => {
    let isMounted = true;
    const fetchTodayNutrition = async () => {
      try {
        const res = await authFetch('/nutrition/today');
        if (isMounted && res && res.success && res.data) {
          setDailyCalories(res.data.targets.calories || 2200);
        }
      } catch (err) {
        console.error('Error fetching today\'s nutrition in profile:', err);
      }
    };
    fetchTodayNutrition();
    return () => {
      isMounted = false;
    };
  }, [authFetch, user]);

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setMobile(user.mobile || '');
      setHeight(user.height || '');
      setWeight(user.weight || '');
      setFitnessGoal(user.fitnessGoal || 'Gain Muscle');
      setExperienceLevel(user.experienceLevel || user.activityLevel || 'Intermediate');
      setDietPreference(user.dietPreference || 'Non-Veg');
    }
  }, [user]);

  // Form Change Detection
  const isFormChanged =
    name !== (user?.name || '') ||
    mobile !== (user?.mobile || '') ||
    String(height) !== String(user?.height || '') ||
    String(weight) !== String(user?.weight || '') ||
    fitnessGoal !== (user?.fitnessGoal || 'Gain Muscle') ||
    experienceLevel !== (user?.experienceLevel || user?.activityLevel || 'Intermediate') ||
    dietPreference !== (user?.dietPreference || 'Non-Veg');

  const biometricsChanged =
    String(height) !== String(user?.height || '') ||
    String(weight) !== String(user?.weight || '') ||
    fitnessGoal !== (user?.fitnessGoal || 'Gain Muscle') ||
    experienceLevel !== (user?.experienceLevel || user?.activityLevel || 'Intermediate') ||
    dietPreference !== (user?.dietPreference || 'Non-Veg');

  // Dynamic Profile Completion
  const getProfileCompletion = () => {
    const hasPersonal = Boolean(user?.name);
    const hasFitness = Boolean(user?.height && user?.weight && user?.fitnessGoal);
    const hasContact = Boolean(user?.email && user?.mobile);
    const hasAvatar = Boolean(user?.profilePicture);

    const fields = [hasPersonal, hasFitness, hasContact, hasAvatar];
    const filledCount = fields.filter(Boolean).length;
    const percentage = Math.round((filledCount / fields.length) * 100);

    return { percentage, hasPersonal, hasFitness, hasContact, hasAvatar };
  };

  const { percentage, hasPersonal, hasFitness, hasContact, hasAvatar } = getProfileCompletion();

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setMobile(user?.mobile || '');
    setHeight(user?.height || '');
    setWeight(user?.weight || '');
    setFitnessGoal(user?.fitnessGoal || 'Gain Muscle');
    setExperienceLevel(user?.experienceLevel || user?.activityLevel || 'Intermediate');
    setDietPreference(user?.dietPreference || 'Non-Veg');
    setIsEditing(false);
    setError('');
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data && data.success && data.data?.user) {
        updateUserProfileState(data.data.user);
        setToast('Profile picture updated successfully!');
        setTimeout(() => setToast(''), 3000);
      } else {
        setError(data.message || 'Failed to upload picture.');
      }
    } catch (err) {
      console.error(err);
      setError('Error uploading image.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!isFormChanged) return;
    if (biometricsChanged) {
      setShowConfirmModal(true);
    } else {
      executeProfileSave(false);
    }
  };

  const executeProfileSave = async (shouldRegeneratePlan) => {
    setSaving(true);
    setError('');
    setShowConfirmModal(false);

    try {
      const payload = {
        name,
        mobile,
        height: Number(height),
        weight: Number(weight),
        fitnessGoal,
        activityLevel: experienceLevel,
        experienceLevel,
        dietPreference
      };

      const res = await authFetch('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        let updatedUser = res.data?.user || { ...user, ...payload };

        if (shouldRegeneratePlan) {
          setToast('Profile updated & AI Plans regenerated!');
        } else {
          setToast('Profile details saved successfully!');
        }

        updateUserProfileState(updatedUser);
        setIsEditing(false);
        setTimeout(() => setToast(''), 3500);
      } else {
        setError(res?.message || 'Failed to save profile changes.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  // Calculations for display
  const workoutsCompleted = user?.workoutHistory?.length || 0;

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';
  
  const h = Number(user?.height) || 0;
  const w = Number(user?.weight) || 0;
  const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : 'N/A';
  
  let targetWeight = 'N/A';
  if (w > 0 && user?.fitnessGoal) {
    if (user.fitnessGoal === 'Lose Weight') targetWeight = (w - 5).toFixed(1) + ' kg';
    if (user.fitnessGoal === 'Gain Muscle') targetWeight = (w + 5).toFixed(1) + ' kg';
    if (user.fitnessGoal === 'Maintain Fitness' || user.fitnessGoal === 'Body Recomposition') targetWeight = w + ' kg';
  }

  // dailyCalories is populated dynamically from backend
  
  // Recent Activity Merge
  const rawWorkouts = (user?.workoutHistory || []).map(w => ({ ...w, type: 'workout', date: new Date(w.date || Date.now()) }));
  const rawMeals = (user?.dietHistory || []).map(m => ({ ...m, type: 'meal', date: new Date(m.date || Date.now()) }));
  const recentActivities = [...rawWorkouts, ...rawMeals].sort((a, b) => b.date - a.date).slice(0, 4);

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.6rem', paddingBottom: '3rem' }}>
      
      {/* Toast & Error Alerts */}
      {toast && (
        <div style={{ background: '#151515', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', borderRadius: '12px', padding: '0.85rem 1.4rem', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}
      {error && (
        <div style={{ background: '#151515', border: '1px solid #FF5252', color: '#FF5252', borderRadius: '12px', padding: '0.85rem 1.4rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Header */}
      <div style={{ background: '#181818', border: '1px solid #262626', borderRadius: '16px', padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem' }}>
          
          {/* Avatar & User Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ position: 'relative' }}>
              {user?.profilePicture ? (
                <img
                  src={getAvatarUrl(user.profilePicture)}
                  alt={user.name}
                  style={{ width: '85px', height: '85px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #262626' }}
                />
              ) : (
                <div style={{ width: '85px', height: '85px', borderRadius: '50%', background: '#1C1C1C', border: '1px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={38} color="#FFFFFF" />
                </div>
              )}
              {isEditing && (
                <label htmlFor="avatar-file-input" style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#1C1C1C', border: '1px solid #FFFFFF', color: '#FFFFFF', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex' }} title="Change Profile Picture">
                  <Camera size={14} />
                  <input id="avatar-file-input" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{user?.name || 'Athlete'}</h1>
                <span style={{ background: '#262626', border: '1px solid #3A3A3A', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '12px' }}>
                  {(user?.currentPlan || user?.plan || 'basic').toUpperCase()}
                </span>
              </div>
              <p style={{ color: '#B3B3B3', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>{user?.email || 'user@fitclub.ai'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{ background: '#1C1C1C', color: '#FFFFFF', border: '1px solid #3A3A3A', borderRadius: '10px', padding: '0.75rem 1.4rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3A3A3A'}
              >
                <Edit3 size={15} color="#B3B3B3" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  style={{ background: '#1C1C1C', color: '#FFFFFF', border: '1px solid #3A3A3A', borderRadius: '10px', padding: '0.75rem 1.2rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <X size={15} color="#B3B3B3" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={!isFormChanged || saving}
                  style={{ background: !isFormChanged || saving ? '#222222' : 'var(--color-primary)', color: !isFormChanged || saving ? '#666666' : '#090909', border: 'none', borderRadius: '10px', padding: '0.75rem 1.4rem', fontWeight: 800, fontSize: '0.88rem', cursor: !isFormChanged || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Check size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Statistics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card weight="primary" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem' }}>
          <div style={{ background: 'var(--color-accent-muted)', padding: '0.6rem', borderRadius: '10px', display: 'flex', border: '1px solid var(--color-accent-muted-border)' }}>
            <Flame size={20} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1.1 }}>{user?.currentStreak || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#B3B3B3', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem' }}>Workout Streak</div>
          </div>
        </Card>
        <Card weight="primary" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem' }}>
          <div style={{ background: 'var(--color-accent-muted)', padding: '0.6rem', borderRadius: '10px', display: 'flex', border: '1px solid var(--color-accent-muted-border)' }}>
            <Dumbbell size={20} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1.1 }}>{workoutsCompleted}</div>
            <div style={{ fontSize: '0.75rem', color: '#B3B3B3', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem' }}>Workouts Completed</div>
          </div>
        </Card>
        <Card weight="secondary" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem' }}>
          <div style={{ background: '#1C1C1C', padding: '0.6rem', borderRadius: '10px', display: 'flex', border: '1px solid #2A2A2A' }}>
            <Calendar size={20} color="#B3B3B3" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>{memberSince}</div>
            <div style={{ fontSize: '0.75rem', color: '#B3B3B3', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem' }}>Member Since</div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout (Grid: Left Content 2/3, Right Sidebar 1/3) */}
      <div className="profile-main-grid">
        
        {/* LEFT COLUMN: Main Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem', flex: 2, minWidth: '0' }}>
          
          {/* Personal Information */}
          <Card weight="secondary" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <User size={18} color="#FFFFFF" />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>PERSONAL INFORMATION</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Full Name</label>
                {isEditing ? (
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }} />
                ) : (
                  <div style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{name || 'Not Added'}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</label>
                <div style={{ color: '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{user?.email || 'user@fitclub.ai'}</span>
                  <Lock size={12} color="#666666" />
                </div>
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Mobile Number</label>
                {isEditing ? (
                  <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+1 (555) 000-0000" style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }} />
                ) : (
                  <div style={{ color: mobile ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{mobile || 'Not Added'}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Gender</label>
                <div style={{ color: user?.gender ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{user?.gender || 'Not Specified'}</div>
              </div>
            </div>
          </Card>

          {/* Fitness & Biometrics */}
          <Card weight="secondary" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <Activity size={18} color="#FFFFFF" />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>FITNESS & BIOMETRICS</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Height</label>
                {isEditing ? (
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175 cm" style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }} />
                ) : (
                  <div style={{ color: height ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{height ? `${height} cm` : 'Not Added'}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Weight</label>
                {isEditing ? (
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75 kg" style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }} />
                ) : (
                  <div style={{ color: weight ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{weight ? `${weight} kg` : 'Not Added'}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>BMI</label>
                <div style={{ color: bmi !== 'N/A' ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{bmi}</div>
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Target Weight</label>
                <div style={{ color: targetWeight !== 'N/A' ? '#FFFFFF' : '#B3B3B3', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{targetWeight}</div>
              </div>
            </div>
          </Card>

          {/* AI Preferences */}
          <Card weight="secondary" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="#FFFFFF" />
                <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>AI PREFERENCES</h3>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  style={{ background: '#1C1C1C', color: '#FFFFFF', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '0.45rem 0.85rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Sparkles size={12} color="var(--color-primary)" />
                  <span>Regenerate Plans</span>
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Fitness Goal</label>
                {isEditing ? (
                  <select value={fitnessGoal} onChange={(e) => setFitnessGoal(e.target.value)} style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }}>
                    <option value="Lose Weight">Lose Weight</option>
                    <option value="Gain Muscle">Gain Muscle</option>
                    <option value="Body Recomposition">Body Recomposition</option>
                    <option value="Maintain Fitness">Maintain Fitness</option>
                  </select>
                ) : (
                  <div style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{fitnessGoal}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Experience Level</label>
                {isEditing ? (
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                ) : (
                  <div style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{experienceLevel}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Diet Preference</label>
                {isEditing ? (
                  <select value={dietPreference} onChange={(e) => setDietPreference(e.target.value)} style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.4rem', outline: 'none' }}>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Veg">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                ) : (
                  <div style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{dietPreference}</div>
                )}
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Daily Calorie Target</label>
                <div style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.4rem' }}>{dailyCalories} kcal</div>
              </div>
            </div>
          </Card>

          {/* Change Password Card */}
          <Card weight="secondary" style={{ gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <Lock size={18} color="#FFFFFF" />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>CHANGE PASSWORD</h3>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: '#888888', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.3rem', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.3rem', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ color: '#888888', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', background: '#090909', border: '1px solid #262626', color: '#FFFFFF', padding: '0.65rem', borderRadius: '8px', marginTop: '0.3rem', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={pwdSaving}
                style={{ width: '100%', background: 'var(--color-primary)', color: '#090909', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.2rem' }}
              >
                {pwdSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem', flex: 1, minWidth: '320px' }}>
          
          {/* Profile Completion Checklist */}
          <Card weight="primary" style={{ gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>PROFILE COMPLETION</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 800 }}>{percentage}%</span>
                <CircularProgress percentage={percentage} size={32} strokeWidth={3.5} color="var(--color-primary)" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: hasPersonal ? '#FFFFFF' : '#888888' }}>
                {hasPersonal ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Circle size={16} />}
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Personal Details</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: hasFitness ? '#FFFFFF' : '#888888' }}>
                {hasFitness ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Circle size={16} />}
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Fitness Information</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: hasContact ? '#FFFFFF' : '#888888' }}>
                {hasContact ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Circle size={16} />}
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Contact Details</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: hasAvatar ? '#FFFFFF' : '#888888' }}>
                {hasAvatar ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Circle size={16} />}
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Profile Picture</span>
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card weight="secondary" style={{ gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <Lock size={18} color="#FFFFFF" />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>ACCOUNT INFO</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888888', fontSize: '0.85rem', fontWeight: 500 }}>Current Plan</span>
                <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700 }}>{user?.currentPlan || user?.plan || 'basic'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888888', fontSize: '0.85rem', fontWeight: 500 }}>Email Status</span>
                <span style={{ color: '#00E676', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Check size={14} /> Verified
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888888', fontSize: '0.85rem', fontWeight: 500 }}>Member Since</span>
                <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700 }}>{memberSince}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888888', fontSize: '0.85rem', fontWeight: 500 }}>Last Login</span>
                <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700 }}>Today</span>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card weight="secondary" style={{ gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #262626', paddingBottom: '0.8rem' }}>
              <History size={18} color="#FFFFFF" />
              <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', margin: 0 }}>RECENT ACTIVITY</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ background: '#1C1C1C', padding: '0.5rem', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
                      {activity.type === 'workout' ? <Dumbbell size={14} color="var(--color-primary)" /> : <Utensils size={14} color="var(--color-success)" />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>
                        {activity.type === 'workout' ? `Completed ${activity.title}` : `Logged ${activity.mealName}`}
                      </span>
                      <span style={{ color: '#888888', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                        {activity.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888888', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No recent activity found.
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
          <div style={{ background: '#181818', border: '1px solid #262626', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={22} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>Regenerate AI Plans?</h3>
            </div>
            <p style={{ color: '#B3B3B3', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              You modified biometrics or experience level affecting your personalized AI Workout & Diet Plans. Would you like to regenerate your plans now?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => executeProfileSave(true)} style={{ width: '100%', background: '#FFFFFF', color: '#090909', border: 'none', borderRadius: '10px', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} />
                <span>Regenerate AI Workout & Diet Plan</span>
              </button>
              <button onClick={() => executeProfileSave(false)} style={{ width: '100%', background: '#1C1C1C', color: '#FFFFFF', border: '1px solid #3A3A3A', borderRadius: '10px', padding: '0.8rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                Keep Existing Plan & Save Profile Only
              </button>
              <button onClick={() => setShowConfirmModal(false)} style={{ width: '100%', background: 'transparent', color: '#B3B3B3', border: 'none', padding: '0.5rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

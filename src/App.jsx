import { useEffect, useState } from "react";
import EntryScreen from "./EntryScreen";
import Dashboard from "./Dashboard";
import { loadProfile, saveProfile, clearProfile } from "./localProfile";

export default function App() {
  const [profile, setProfile] = useState(undefined); // undefined = still checking

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const handleEntry = (newProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
  };

  const handleUpdate = (updated) => {
    saveProfile(updated);
    setProfile(updated);
  };

  const handleReset = () => {
    clearProfile();
    setProfile(null);
  };

  if (profile === undefined) {
    return <div className="flex items-center justify-center min-h-screen">กำลังโหลด...</div>;
  }

  if (!profile) {
    return <EntryScreen onDone={handleEntry} />;
  }

  return <Dashboard profile={profile} onProfileUpdate={handleUpdate} onReset={handleReset} />;
}

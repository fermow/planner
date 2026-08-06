import Layout from './components/Layout';
import StarBackground from './components/StarBackground';
import { useStore } from './store/useStore';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';

function NotificationPump() {
  useBrowserNotifications();
  return null;
}

export default function App() {
  const { theme } = useStore();

  return (
    <div className={theme === 'kawaii' ? 'theme-kawaii' : ''}>
      <StarBackground />
      <Layout />
      <NotificationPump />
    </div>
  );
}

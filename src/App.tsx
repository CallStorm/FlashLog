import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ReminderHost } from '@/components/ReminderHost';
import { Home } from '@/pages/Home';
import { History } from '@/pages/History';
import { Messages } from '@/pages/Messages';
import { Settings } from '@/pages/Settings';
import { Analysis } from '@/pages/Analysis';

export default function App() {
  return (
    <>
      <ReminderHost />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="messages" element={<Messages />} />
          <Route path="history" element={<History />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}

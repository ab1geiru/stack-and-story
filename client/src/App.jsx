import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './lib/auth.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { JournalPage } from './pages/JournalPage.jsx';
import { PostPage } from './pages/PostPage.jsx';
import { WritePage } from './pages/WritePage.jsx';
import { SignInPage } from './pages/SignInPage.jsx';
import { SignUpPage } from './pages/SignUpPage.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <JournalPage /> },
      { path: 'posts/:postId', element: <PostPage /> },
      { path: 'posts/:postId/edit', element: <WritePage /> },
      { path: 'write', element: <WritePage /> },
      { path: 'signin', element: <SignInPage /> },
      { path: 'signup', element: <SignUpPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

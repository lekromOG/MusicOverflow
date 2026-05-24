import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go Back Home
      </Link>
    </div>
  );
}

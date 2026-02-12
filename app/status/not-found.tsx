import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl font-bold text-accent mb-2">404</div>
        <h1 className="text-3xl font-bold text-foreground">Access Key Not Found</h1>
        <p className="text-muted-foreground">
          The rental access key you provided doesn&apos;t exist or has expired.
          Please check the link and try again.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}

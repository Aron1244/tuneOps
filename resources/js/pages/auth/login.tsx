import { useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import loginRoute from '@/routes/login';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
    });

    return (
        <>
            <Head title="Log in" />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    post(loginRoute.store.url());
                }}
                className="flex flex-col gap-6"
            >
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoFocus
                            placeholder="email@example.com"
                        />
                        {errors.email && (
                            <div className="text-sm text-red-500">{errors.email}</div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            placeholder="Password"
                        />
                        {errors.password && (
                            <div className="text-sm text-red-500">{errors.password}</div>
                        )}
                    </div>

                    <Button type="submit" disabled={processing} className="w-full">
                        {processing ? 'Logging in...' : 'Log in'}
                    </Button>
                </div>
            </form>

            {status && (
                <div className="text-center text-sm text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
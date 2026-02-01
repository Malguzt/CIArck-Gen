import { profilesService } from '@/lib/profiles';
import ProfileForm from './profile-form';

export default async function EditProfilePage({ params }: { params: { id: string } }) {
    const profile = await profilesService.getProfile(params.id);

    if (!profile) {
        return <div>Profile not found</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold">Edit Profile</h2>
            </header>
            <ProfileForm initialData={profile} />
        </div>
    );
}

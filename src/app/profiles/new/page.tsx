import ProfileForm from '../[id]/profile-form';

export default function NewProfilePage() {
    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold">Create New Profile</h2>
            </header>
            <ProfileForm />
        </div>
    );
}

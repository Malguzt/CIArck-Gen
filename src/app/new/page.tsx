import { Suspense } from 'react';
import NewPostForm from './post-form';

export default function NewPostPage() {
    return (
        <Suspense fallback={<div>Loading editor...</div>}>
            <NewPostForm />
        </Suspense>
    );
}

import fs from 'fs';
import path from 'path';
import { Profile } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

export class ProfilesService {

    private ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(PROFILES_FILE)) {
            fs.writeFileSync(PROFILES_FILE, JSON.stringify([], null, 2));
        }
    }

    async getProfiles(): Promise<Profile[]> {
        this.ensureDataDir();
        try {
            const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
            return JSON.parse(data) as Profile[];
        } catch (error) {
            console.error('Failed to read profiles:', error);
            return [];
        }
    }

    async getProfile(id: string): Promise<Profile | undefined> {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.id === id);
    }

    async saveProfile(profile: Profile): Promise<Profile> {
        const profiles = await this.getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);

        if (index >= 0) {
            profiles[index] = profile;
        } else {
            profiles.push(profile);
        }

        fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
        return profile;
    }

    async deleteProfile(id: string): Promise<void> {
        const profiles = await this.getProfiles();
        const filtered = profiles.filter(p => p.id !== id);
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(filtered, null, 2));
    }
}

export const profilesService = new ProfilesService();

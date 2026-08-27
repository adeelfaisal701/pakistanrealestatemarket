import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Property } from '@/types/property';
import { AgentPropertyListing } from '@/types/crm';
import { ModerationProperty } from '@/types/admin';
import { MOCK_PROPERTIES } from './mock-data';
import { INITIAL_AGENT_PROPERTIES } from './crm-mock-data';
import { INITIAL_MODERATION_PROPERTIES } from './admin-mock-data';

export interface NewListingInput {
  title: string;
  price: string;
  society: string;
  area: string;
  beds: number;
  baths: number;
  purpose: 'Buy' | 'Rent';
  propertyType: 'House' | 'Plot' | 'Apartment' | 'Commercial';
  imageUrl?: string;
  description?: string;
  agentName?: string;
  agentPhone?: string;
}

interface PropertyState {
  // Public Marketplace Properties
  publicProperties: Property[];

  // Agent CRM Properties
  agentProperties: AgentPropertyListing[];

  // Super Admin Moderation Properties
  moderationProperties: ModerationProperty[];

  // Instant Public Publish Action
  addPropertyFromAgent: (data: NewListingInput) => {
    publicItem: Property;
    agentItem: AgentPropertyListing;
    moderationItem: ModerationProperty;
  };

  // Moderation Safety Net Actions
  makePropertyLive: (id: string) => void;
  blockProperty: (id: string) => void;
  deleteProperty: (id: string) => void;
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      publicProperties: MOCK_PROPERTIES,
      agentProperties: INITIAL_AGENT_PROPERTIES,
      moderationProperties: INITIAL_MODERATION_PROPERTIES,

      addPropertyFromAgent: (data) => {
        const id = `prop-${Date.now()}`;
        const defaultImage =
          data.imageUrl?.trim() ||
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';

        // 1. Instantly Live Public Marketplace Listing
        const publicItem: Property = {
          id,
          title: data.title,
          price: data.price,
          location: data.society,
          society: data.society,
          beds: data.beds,
          baths: data.baths,
          area: data.area,
          type: data.propertyType,
          purpose: data.purpose,
          imageUrl: defaultImage,
          freshnessBadge: '🟢 Confirmed Today',
          verificationLevel: 'Level 2',
          agentName: data.agentName || 'Adeel & Associates (Verified Agent)',
          agentPhone: data.agentPhone || '923004445566',
          isFeatured: true,
        };

        // 2. Active Agent CRM Listing
        const agentItem: AgentPropertyListing = {
          id,
          title: data.title,
          price: data.price,
          society: data.society,
          area: data.area,
          beds: data.beds,
          baths: data.baths,
          status: 'Active',
          purpose: data.purpose,
          propertyType: data.propertyType,
          imageUrl: defaultImage,
          description: data.description,
          createdAt: new Date().toISOString().split('T')[0],
        };

        // 3. Post-Moderation Admin Entry (Instant Live State)
        const moderationItem: ModerationProperty = {
          id,
          title: data.title,
          price: data.price,
          society: data.society,
          agentName: data.agentName || 'Adeel & Associates',
          status: 'Live', // OLX / Zameen instant live post-moderation
          propertyType: data.propertyType,
          area: data.area,
          imageUrl: defaultImage,
          submittedAt: 'Just now',
        };

        set((state) => ({
          publicProperties: [publicItem, ...state.publicProperties],
          agentProperties: [agentItem, ...state.agentProperties],
          moderationProperties: [moderationItem, ...state.moderationProperties],
        }));

        return { publicItem, agentItem, moderationItem };
      },

      makePropertyLive: (id) => {
        const state = get();
        const existingMod = state.moderationProperties.find((p) => p.id === id);

        // If not in public list, restore it
        const alreadyInPublic = state.publicProperties.some((p) => p.id === id);
        let updatedPublic = state.publicProperties;

        if (!alreadyInPublic && existingMod) {
          const restoredPublic: Property = {
            id: existingMod.id,
            title: existingMod.title,
            price: existingMod.price,
            location: existingMod.society,
            society: existingMod.society,
            beds: 3,
            baths: 3,
            area: existingMod.area || '5 Marla',
            type: (existingMod.propertyType as any) || 'House',
            purpose: 'Buy',
            imageUrl:
              existingMod.imageUrl ||
              'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
            freshnessBadge: '🟢 Confirmed Today',
            verificationLevel: 'Level 2',
            agentName: existingMod.agentName,
            agentPhone: '923004445566',
            isFeatured: true,
          };
          updatedPublic = [restoredPublic, ...state.publicProperties];
        }

        set({
          publicProperties: updatedPublic,
          moderationProperties: state.moderationProperties.map((p) =>
            p.id === id ? { ...p, status: 'Live' as const } : p
          ),
          agentProperties: state.agentProperties.map((p) =>
            p.id === id ? { ...p, status: 'Active' as const } : p
          ),
        });
      },

      blockProperty: (id) => {
        set((state) => ({
          // Immediately hide from Public Marketplace
          publicProperties: state.publicProperties.filter((p) => p.id !== id),
          // Mark as blocked in Admin Moderation
          moderationProperties: state.moderationProperties.map((p) =>
            p.id === id ? { ...p, status: 'Blocked' as const } : p
          ),
          // Mark as Draft/Blocked in Agent inventory
          agentProperties: state.agentProperties.map((p) =>
            p.id === id ? { ...p, status: 'Draft' as const } : p
          ),
        }));
      },

      deleteProperty: (id) => {
        set((state) => ({
          publicProperties: state.publicProperties.filter((p) => p.id !== id),
          moderationProperties: state.moderationProperties.filter((p) => p.id !== id),
          agentProperties: state.agentProperties.filter((p) => p.id !== id),
        }));
      },
    }),
    {
      name: 'estatepro-global-properties-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);

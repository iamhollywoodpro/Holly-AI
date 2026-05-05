// HOLLY Music Feature: Professional Email Templates
// Generates pitch emails for sync licensing and playlist curators

export interface EmailTemplate {
  subject: string;
  body: string;
  recipient: {
    name: string;
    email: string;
    company?: string;
  };
  metadata?: {
    trackTitle?: string;
    artistName?: string;
    opportunityType?: string;
  };
}

export interface AudioFeatures {
  tempo: number;
  bpm: number;
  key: string;
  energy: number;
  mood: string;
  genre: string;
}

export interface SyncOpportunity {
  id: string;
  title: string;
  type: 'film' | 'tv' | 'commercial' | 'gaming';
  company: string;
  budget: { min: number; max: number };
  deadline: string;
  contact: {
    name: string;
    email: string;
    role: string;
  };
  description: string;
  requirements: {
    mood: string[];
    tempo: string;
    genre: string[];
  };
}

export interface PlaylistCurator {
  id: string;
  name: string;
  platform: 'spotify' | 'apple' | 'independent';
  playlistName: string;
  followers: number;
  genre: string[];
  contact: {
    email: string;
    submissionUrl?: string;
  };
  submissionFee?: number;
  approvalRate: number;
  responseTime: string;
}

/**
 * Generate sync licensing pitch email
 */
export function generateSyncPitchEmail(
  opportunity: SyncOpportunity,
  artistName: string,
  trackTitle: string,
  audioFeatures: AudioFeatures
): EmailTemplate {
  const { contact, title, type, budget } = opportunity;
  
  const subject = `Perfect ${type.toUpperCase()} Sync: "${trackTitle}" by ${artistName}`;
  
  const body = `Hi ${contact.name},

I hope this email finds you well. I'm reaching out regarding the ${title} opportunity.

I'd love to introduce you to "${trackTitle}" by ${artistName}, which I believe would be a perfect fit for this ${type} project.

**Track Overview:**
• Title: ${trackTitle}
• Artist: ${artistName}
• Genre: ${audioFeatures.genre}
• Mood: ${audioFeatures.mood}
• Tempo: ${audioFeatures.bpm} BPM
• Key: ${audioFeatures.key}
• Energy Level: ${audioFeatures.energy}/10

**Why This Track Fits:**
The ${audioFeatures.mood} vibe and ${audioFeatures.energy > 7 ? 'high-energy' : 'laid-back'} feel of this track aligns perfectly with what you're looking for. The ${audioFeatures.tempo} tempo creates ${audioFeatures.energy > 7 ? 'an engaging, dynamic atmosphere' : 'a smooth, compelling backdrop'} that would enhance your project beautifully.

**Licensing Details:**
• 100% cleared for sync licensing
• Master & Publishing rights available
• Quick turnaround on paperwork
• Flexible licensing terms
• Budget range discussed: $${budget.min.toLocaleString()} - $${budget.max.toLocaleString()}

I'd love to send you the full track for review. Would you be available for a brief call this week to discuss?

Looking forward to hearing from you!

Best regards,
${artistName} Management Team

P.S. I'm also happy to provide stems, alternate versions, or custom edits if needed for the project.`;

  return {
    subject,
    body,
    recipient: {
      name: contact.name,
      email: contact.email,
      company: opportunity.company,
    },
    metadata: {
      trackTitle,
      artistName,
      opportunityType: `sync-${type}`,
    },
  };
}

/**
 * Generate playlist curator pitch email
 */
export function generatePlaylistPitchEmail(
  curator: PlaylistCurator,
  artistName: string,
  trackTitle: string,
  audioFeatures: AudioFeatures,
  spotifyUrl: string
): EmailTemplate {
  const subject = `Playlist Submission: "${trackTitle}" by ${artistName} for ${curator.playlistName}`;
  
  const body = `Hi ${curator.name || 'there'},

I'm reaching out to introduce you to "${trackTitle}" by ${artistName}, which I believe would be a great addition to your ${curator.playlistName} playlist (${curator.followers.toLocaleString()} followers).

**Track Information:**
🎵 Artist: ${artistName}
🎵 Title: ${trackTitle}
🎵 Genre: ${audioFeatures.genre}
🎵 Mood: ${audioFeatures.mood}
🎵 BPM: ${audioFeatures.bpm}
🎵 Spotify: ${spotifyUrl}

**Why This Fits Your Playlist:**
This ${audioFeatures.mood} ${audioFeatures.genre} track brings ${audioFeatures.energy > 7 ? 'high energy and' : ''} a fresh sound that aligns perfectly with the vibe of ${curator.playlistName}. ${audioFeatures.energy > 7 ? 'The driving rhythm and dynamic production' : 'The smooth production and melodic elements'} would resonate with your audience.

**Artist Background:**
${artistName} is ${audioFeatures.energy > 7 ? 'an emerging artist making waves' : 'a talented artist building momentum'} in the ${audioFeatures.genre} scene. This track has been ${audioFeatures.energy > 7 ? 'gaining traction' : 'steadily growing'} with early listeners and would be a strong addition to your carefully curated selection.

${curator.submissionFee ? `I understand there's a $${curator.submissionFee} submission fee and I'm happy to proceed with that.` : ''}

Would love to hear your thoughts! Feel free to reach out if you need any additional information.

Thanks for considering!

Best,
${artistName} Team`;

  return {
    subject,
    body,
    recipient: {
      name: curator.name,
      email: curator.contact.email,
    },
    metadata: {
      trackTitle,
      artistName,
      opportunityType: 'playlist-pitch',
    },
  };
}

/**
 * Generate follow-up email
 */
export function generateFollowUpEmail(
  originalEmail: EmailTemplate,
  daysSince: number
): EmailTemplate {
  const { recipient, metadata } = originalEmail;
  const isSync = metadata?.opportunityType?.includes('sync');
  
  const subject = `Following Up: ${metadata?.trackTitle} for ${isSync ? 'Sync Licensing' : 'Playlist Consideration'}`;
  
  const body = `Hi ${recipient.name},

I wanted to follow up on my email from ${daysSince} days ago about "${metadata?.trackTitle}" by ${metadata?.artistName}.

${isSync ? 'I know you receive many submissions, but I genuinely believe this track would be perfect for your project. The timing is flexible and we can work within your production schedule.' : 'I understand you curate carefully and receive many submissions. I just wanted to make sure this didn\'t get lost in your inbox.'}

${isSync ? 'Would you like me to send over the full track, stems, or any additional materials?' : 'Would you like me to provide any additional information about the track or artist?'}

${daysSince > 14 ? 'If the timing isn\'t right, I completely understand and would appreciate any feedback you might have.' : 'Looking forward to hearing your thoughts!'}

Thanks for your time!

Best regards,
${metadata?.artistName} Team`;

  return {
    subject,
    body,
    recipient,
    metadata: {
      ...metadata,
      followUp: true,
      daysSince,
    } as any,
  };
}

/**
 * Generate batch sync pitches
 */
export function generateBatchSyncPitches(
  opportunities: SyncOpportunity[],
  artistName: string,
  trackTitle: string,
  audioFeatures: AudioFeatures
): EmailTemplate[] {
  return opportunities.map(opp => 
    generateSyncPitchEmail(opp, artistName, trackTitle, audioFeatures)
  );
}

/**
 * Generate batch playlist pitches
 */
export function generateBatchPlaylistPitches(
  curators: PlaylistCurator[],
  artistName: string,
  trackTitle: string,
  audioFeatures: AudioFeatures,
  spotifyUrl: string
): EmailTemplate[] {
  return curators.map(curator =>
    generatePlaylistPitchEmail(curator, artistName, trackTitle, audioFeatures, spotifyUrl)
  );
}

/**
 * Generate thank you email after acceptance
 */
export function generateThankYouEmail(
  recipientName: string,
  recipientEmail: string,
  opportunityType: 'sync' | 'playlist',
  details: string
): EmailTemplate {
  const subject = opportunityType === 'sync' 
    ? 'Thank You - Excited to Work Together!'
    : 'Thank You for the Playlist Add!';
  
  const body = opportunityType === 'sync'
    ? `Hi ${recipientName},

Thank you so much for choosing our track for ${details}! We're incredibly excited to be part of this project.

We'll have all paperwork completed within 24-48 hours and are standing by for any additional materials you might need (stems, alternate versions, etc.).

Looking forward to seeing the final project!

Best regards,
The Team`
    : `Hi ${recipientName},

Thank you so much for adding our track to ${details}! We're honored to be part of your carefully curated playlist.

We'll be sure to share it with our audience and help drive engagement to the playlist.

Looking forward to future collaborations!

Best regards,
The Team`;

  return {
    subject,
    body,
    recipient: {
      name: recipientName,
      email: recipientEmail,
    },
    metadata: {
      opportunityType: `thank-you-${opportunityType}`,
    },
  };
}

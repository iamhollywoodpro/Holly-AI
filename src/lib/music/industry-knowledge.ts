/**
 * Music Industry Knowledge Base
 * 
 * Comprehensive database of:
 * - Record Labels (Major, Independent, Boutique)
 * - PROs (Performance Rights Organizations)
 * - Distributors
 * - Publishing Companies
 * - Sync Agencies
 * - Industry Standards and Best Practices
 */

export interface RecordLabel {
  id: string;
  name: string;
  type: 'major' | 'independent' | 'boutique';
  parent?: string; // Parent company if applicable
  genres: string[];
  size: 'large' | 'medium' | 'small';
  roster: string[]; // Notable artists
  submissionEmail?: string;
  website: string;
  acceptsUnsolicited: boolean;
  dealTypes: ('traditional' | '360' | 'licensing' | 'distribution')[];
  royaltyRate?: string; // e.g., "15-20%"
  advanceRange?: string; // e.g., "$5k-$50k"
  notes: string;
}

export interface PRO {
  id: string;
  name: string;
  country: string;
  type: 'performance' | 'mechanical' | 'both';
  website: string;
  membershipFee: string;
  payoutFrequency: string;
  internationalAffiliates: string[];
  specialties: string[];
  pros: string[];
  cons: string[];
}

export interface Distributor {
  id: string;
  name: string;
  type: 'digital' | 'physical' | 'both';
  pricing: {
    model: 'subscription' | 'per_release' | 'commission' | 'free';
    cost: string;
    commission?: string;
  };
  platforms: string[]; // Spotify, Apple Music, etc.
  features: string[];
  payoutSchedule: string;
  minimumPayout: string;
  keepRights: boolean;
  pros: string[];
  cons: string[];
  bestFor: string[];
  website: string;
}

export interface PublishingCompany {
  id: string;
  name: string;
  type: 'major' | 'independent';
  services: string[];
  dealTypes: ('admin' | 'co_pub' | 'full')[];
  adminFee?: string;
  publisherSplit?: string;
  territory: 'worldwide' | 'specific';
  acceptsUnsolicited: boolean;
  website: string;
  notes: string;
}

export interface SyncAgency {
  id: string;
  name: string;
  specialties: string[]; // TV, Film, Advertising, Gaming
  genres: string[];
  exclusive: boolean;
  commission: string;
  placementHistory: string[];
  submissionProcess: string;
  website: string;
  contact?: string;
}

export class IndustryKnowledge {
  // Major Record Labels
  private majorLabels: RecordLabel[] = [
    {
      id: 'universal',
      name: 'Universal Music Group',
      type: 'major',
      genres: ['Pop', 'Rock', 'Hip-Hop', 'Country', 'Electronic', 'R&B'],
      size: 'large',
      roster: ['Taylor Swift', 'Drake', 'Billie Eilish', 'The Weeknd'],
      website: 'https://www.universalmusic.com',
      acceptsUnsolicited: false,
      dealTypes: ['traditional', '360'],
      royaltyRate: '15-18%',
      advanceRange: '$50k-$1M+',
      notes: 'Largest music company worldwide. Rarely accepts unsolicited demos.'
    },
    {
      id: 'sony',
      name: 'Sony Music Entertainment',
      type: 'major',
      genres: ['Pop', 'Rock', 'Hip-Hop', 'Country', 'Latin'],
      size: 'large',
      roster: ['Beyoncé', 'Harry Styles', 'Travis Scott', 'Adele'],
      website: 'https://www.sonymusic.com',
      acceptsUnsolicited: false,
      dealTypes: ['traditional', '360'],
      royaltyRate: '15-18%',
      advanceRange: '$50k-$1M+',
      notes: 'Second largest music company. Strong in pop and hip-hop.'
    },
    {
      id: 'warner',
      name: 'Warner Music Group',
      type: 'major',
      genres: ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Alternative'],
      size: 'large',
      roster: ['Ed Sheeran', 'Dua Lipa', 'Bruno Mars', 'Lizzo'],
      website: 'https://www.wmg.com',
      acceptsUnsolicited: false,
      dealTypes: ['traditional', '360'],
      royaltyRate: '15-18%',
      advanceRange: '$50k-$1M+',
      notes: 'Third major label. Known for artist-friendly deals.'
    }
  ];
  
  // Independent Record Labels
  private independentLabels: RecordLabel[] = [
    {
      id: 'empire',
      name: 'EMPIRE',
      type: 'independent',
      genres: ['Hip-Hop', 'R&B', 'Electronic'],
      size: 'large',
      roster: ['XXXTentacion', 'Anderson .Paak', 'Snoh Aalegra'],
      website: 'https://www.empire.com',
      acceptsUnsolicited: true,
      dealTypes: ['licensing', 'distribution'],
      royaltyRate: '70-80%',
      advanceRange: '$10k-$100k',
      notes: 'Artist-friendly deals, strong in hip-hop and R&B.'
    },
    {
      id: 'defected',
      name: 'Defected Records',
      type: 'independent',
      genres: ['House', 'Electronic', 'Dance'],
      size: 'medium',
      roster: ['Sam Divine', 'Ferreck Dawn', 'Purple Disco Machine'],
      website: 'https://www.defected.com',
      acceptsUnsolicited: true,
      dealTypes: ['traditional', 'licensing'],
      royaltyRate: '50-70%',
      notes: 'Leading house music label. Accepts demos.'
    },
    {
      id: 'subpop',
      name: 'Sub Pop Records',
      type: 'independent',
      genres: ['Indie Rock', 'Alternative', 'Punk'],
      size: 'medium',
      roster: ['Nirvana (historical)', 'Fleet Foxes', 'Beach House'],
      website: 'https://www.subpop.com',
      acceptsUnsolicited: true,
      dealTypes: ['traditional', 'licensing'],
      royaltyRate: '50-70%',
      notes: 'Legendary indie label, discovered Nirvana.'
    },
    {
      id: 'anjuna',
      name: 'Anjunabeats',
      type: 'independent',
      genres: ['Trance', 'Progressive House', 'Electronic'],
      size: 'medium',
      roster: ['Above & Beyond', 'Arty', 'ilan Bluestone'],
      website: 'https://www.anjunabeats.com',
      acceptsUnsolicited: true,
      dealTypes: ['traditional'],
      royaltyRate: '50-65%',
      notes: 'Premier trance/progressive label. Demos via website.'
    }
  ];
  
  // PROs (Performance Rights Organizations)
  private pros: PRO[] = [
    {
      id: 'ascap',
      name: 'ASCAP',
      country: 'USA',
      type: 'performance',
      website: 'https://www.ascap.com',
      membershipFee: 'Free',
      payoutFrequency: 'Quarterly',
      internationalAffiliates: ['PRS (UK)', 'GEMA (Germany)', 'SACEM (France)'],
      specialties: ['Performance royalties', 'Live venues', 'Radio', 'Streaming'],
      pros: ['No membership fee', 'Strong advocacy', 'Good for live performers'],
      cons: ['Complex payout structure', 'Slower international collections']
    },
    {
      id: 'bmi',
      name: 'BMI',
      country: 'USA',
      type: 'performance',
      website: 'https://www.bmi.com',
      membershipFee: 'Free',
      payoutFrequency: 'Quarterly',
      internationalAffiliates: ['PRS (UK)', 'APRA (Australia)', 'SOCAN (Canada)'],
      specialties: ['Performance royalties', 'Radio', 'TV', 'Digital'],
      pros: ['No membership fee', 'Largest repertoire', 'Strong in country/pop'],
      cons: ['Less transparent payouts', 'Complicated international deals']
    },
    {
      id: 'sesac',
      name: 'SESAC',
      country: 'USA',
      type: 'performance',
      website: 'https://www.sesac.com',
      membershipFee: 'Invitation only',
      payoutFrequency: 'Quarterly',
      internationalAffiliates: ['Various'],
      specialties: ['Performance royalties', 'Christian music', 'Gospel'],
      pros: ['More personalized service', 'Higher payouts (selective roster)', 'Faster payments'],
      cons: ['Invitation only', 'Smaller repertoire', 'Less transparency']
    },
    {
      id: 'prs',
      name: 'PRS for Music',
      country: 'UK',
      type: 'both',
      website: 'https://www.prsformusic.com',
      membershipFee: '£50-100',
      payoutFrequency: 'Quarterly',
      internationalAffiliates: ['ASCAP (USA)', 'SOCAN (Canada)', 'APRA (Australia)'],
      specialties: ['Performance and mechanical royalties', 'Strong international'],
      pros: ['Handles both performance and mechanical', 'Strong European presence', 'Transparent'],
      cons: ['Membership fee', 'Complex registration process']
    }
  ];
  
  // Digital Distributors
  private distributors: Distributor[] = [
    {
      id: 'distrokid',
      name: 'DistroKid',
      type: 'digital',
      pricing: {
        model: 'subscription',
        cost: '$22.99/year',
        commission: '0%'
      },
      platforms: ['Spotify', 'Apple Music', 'Amazon', 'Tidal', 'Deezer', 'YouTube Music', 'TikTok', 'Instagram'],
      features: ['Unlimited uploads', 'Keep 100% royalties', 'Fast distribution', 'Spotify pre-saves', 'YouTube Content ID'],
      payoutSchedule: 'Weekly',
      minimumPayout: '$5',
      keepRights: true,
      pros: ['Cheapest option', 'Unlimited releases', 'Fast distribution', 'Keep all royalties', 'Easy to use'],
      cons: ['Annual fee required', 'Extra fees for some features', 'Must pay to keep music up'],
      bestFor: ['Independent artists', 'Prolific releases', 'Budget-conscious'],
      website: 'https://www.distrokid.com'
    },
    {
      id: 'tunecore',
      name: 'TuneCore',
      type: 'digital',
      pricing: {
        model: 'per_release',
        cost: '$14.99/single, $49.99/album per year'
      },
      platforms: ['Spotify', 'Apple Music', 'Amazon', 'Tidal', 'Deezer', 'YouTube Music', 'TikTok'],
      features: ['Keep 100% royalties', 'Publishing administration', 'YouTube monetization', 'Social media features'],
      payoutSchedule: 'Monthly',
      minimumPayout: '$10',
      keepRights: true,
      pros: ['Keep 100% royalties', 'Established reputation', 'Publishing admin available', 'Good analytics'],
      cons: ['Annual renewal fees', 'More expensive than DistroKid', 'Per-release pricing'],
      bestFor: ['Selective releases', 'Artists wanting publishing help', 'Established artists'],
      website: 'https://www.tunecore.com'
    },
    {
      id: 'cdbaby',
      name: 'CD Baby',
      type: 'both',
      pricing: {
        model: 'per_release',
        cost: '$9.95/single, $29/album (one-time)',
        commission: '9%'
      },
      platforms: ['Spotify', 'Apple Music', 'Amazon', 'Tidal', 'Physical distribution'],
      features: ['One-time payment', 'Physical distribution', 'Publishing admin', 'Sync licensing opportunities'],
      payoutSchedule: 'Monthly',
      minimumPayout: '$10',
      keepRights: true,
      pros: ['One-time payment', 'Physical distribution', 'Sync opportunities', 'No annual fees'],
      cons: ['Takes 9% commission', 'Slower distribution', 'Less features than competitors'],
      bestFor: ['Physical releases', 'Long-term catalog', 'Artists avoiding subscriptions'],
      website: 'https://www.cdbaby.com'
    },
    {
      id: 'amuse',
      name: 'Amuse',
      type: 'digital',
      pricing: {
        model: 'free',
        cost: 'Free',
        commission: '0%'
      },
      platforms: ['Spotify', 'Apple Music', 'Amazon', 'Tidal', 'Deezer', 'YouTube Music'],
      features: ['Completely free', 'Keep 100% royalties', 'Mobile app', 'A&R opportunities'],
      payoutSchedule: 'Monthly',
      minimumPayout: '$10',
      keepRights: true,
      pros: ['Completely free', 'Keep 100% royalties', 'Easy mobile app', 'Potential label deals'],
      cons: ['Slower distribution', 'Fewer features', 'Limited analytics', 'May scout and sign you'],
      bestFor: ['Beginners', 'Testing distribution', 'Budget-conscious', 'Artists seeking deals'],
      website: 'https://www.amuse.io'
    }
  ];
  
  // Sync Agencies
  private syncAgencies: SyncAgency[] = [
    {
      id: 'musicbed',
      name: 'Musicbed',
      specialties: ['Film', 'TV', 'Advertising', 'Brand content'],
      genres: ['Cinematic', 'Indie', 'Electronic', 'Acoustic'],
      exclusive: true,
      commission: '50%',
      placementHistory: ['Apple', 'Nike', 'Netflix', 'HBO'],
      submissionProcess: 'Apply via website with portfolio',
      website: 'https://www.musicbed.com',
      contact: 'artists@musicbed.com'
    },
    {
      id: 'marmoset',
      name: 'Marmoset',
      specialties: ['Advertising', 'Brand content', 'TV'],
      genres: ['Indie', 'Electronic', 'Hip-Hop', 'Rock'],
      exclusive: false,
      commission: '50%',
      placementHistory: ['Google', 'Amazon', 'Target', 'BMW'],
      submissionProcess: 'Submit tracks via website',
      website: 'https://www.marmosetmusic.com'
    },
    {
      id: 'audiosocket',
      name: 'AudioSocket',
      specialties: ['TV', 'Film', 'Digital media', 'Gaming'],
      genres: ['All genres'],
      exclusive: false,
      commission: '50%',
      placementHistory: ['MTV', 'ESPN', 'Discovery', 'E!'],
      submissionProcess: 'Open submissions via website',
      website: 'https://www.audiosocket.com'
    }
  ];
  
  /**
   * Get all record labels
   */
  getAllLabels(): RecordLabel[] {
    return [...this.majorLabels, ...this.independentLabels];
  }
  
  /**
   * Get labels by type
   */
  getLabelsByType(type: 'major' | 'independent' | 'boutique'): RecordLabel[] {
    return this.getAllLabels().filter(label => label.type === type);
  }
  
  /**
   * Get labels that accept unsolicited demos
   */
  getLabelsAcceptingDemos(): RecordLabel[] {
    return this.getAllLabels().filter(label => label.acceptsUnsolicited);
  }
  
  /**
   * Find labels by genre
   */
  findLabelsByGenre(genre: string): RecordLabel[] {
    return this.getAllLabels().filter(label => 
      label.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
    );
  }
  
  /**
   * Get all PROs
   */
  getAllPROs(): PRO[] {
    return this.pros;
  }
  
  /**
   * Get PROs by country
   */
  getPROsByCountry(country: string): PRO[] {
    return this.pros.filter(pro => pro.country === country);
  }
  
  /**
   * Compare PROs
   */
  comparePROs(proIds: string[]): PRO[] {
    return this.pros.filter(pro => proIds.includes(pro.id));
  }
  
  /**
   * Get all distributors
   */
  getAllDistributors(): Distributor[] {
    return this.distributors;
  }
  
  /**
   * Find distributors by pricing model
   */
  getDistributorsByPricing(model: 'subscription' | 'per_release' | 'commission' | 'free'): Distributor[] {
    return this.distributors.filter(dist => dist.pricing.model === model);
  }
  
  /**
   * Get free distributors
   */
  getFreeDistributors(): Distributor[] {
    return this.getDistributorsByPricing('free');
  }
  
  /**
   * Get all sync agencies
   */
  getAllSyncAgencies(): SyncAgency[] {
    return this.syncAgencies;
  }
  
  /**
   * Find sync agencies by specialty
   */
  findSyncAgenciesBySpecialty(specialty: string): SyncAgency[] {
    return this.syncAgencies.filter(agency =>
      agency.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
    );
  }
  
  /**
   * Find sync agencies by genre
   */
  findSyncAgenciesByGenre(genre: string): SyncAgency[] {
    return this.syncAgencies.filter(agency =>
      agency.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
    );
  }
  
  /**
   * Get non-exclusive sync agencies
   */
  getNonExclusiveSyncAgencies(): SyncAgency[] {
    return this.syncAgencies.filter(agency => !agency.exclusive);
  }
  
  /**
   * Get industry best practices
   */
  getBestPractices(): {
    submissions: string[];
    contracts: string[];
    royalties: string[];
    marketing: string[];
  } {
    return {
      submissions: [
        'Research the label/curator before submitting',
        'Follow submission guidelines exactly',
        'Send professionally mixed and mastered tracks only',
        'Include a brief, compelling bio (2-3 sentences)',
        'Never pay for playlist placement',
        'Track your submissions and follow up appropriately',
        'Build relationships, not just transactions'
      ],
      contracts: [
        'Always read contracts thoroughly before signing',
        'Hire a music attorney for major deals',
        'Understand the difference between mechanical and performance royalties',
        'Know your reversion rights (when you get rights back)',
        'Be wary of 360 deals unless advance is substantial',
        'Keep ownership of your master recordings if possible',
        'Understand territory limitations'
      ],
      royalties: [
        'Register with a PRO immediately (ASCAP, BMI, or SESAC)',
        'Register with SoundExchange for digital radio royalties',
        'Consider a publishing administrator',
        'Track all income sources (streaming, sync, performance, mechanical)',
        'Understand the difference between publishing and master royalties',
        'Keep detailed records of all agreements',
        'International royalties require collection societies'
      ],
      marketing: [
        'Build your email list from day one',
        'Focus on 1-2 social platforms and master them',
        'Release music consistently (quality over quantity)',
        'Engage with fans authentically',
        'Leverage playlist placement strategically',
        'Use pre-save campaigns for releases',
        'Analyze your data and adjust strategy',
        'Collaborate with artists in your niche'
      ]
    };
  }
  
  /**
   * Get royalty rate guidelines
   */
  getRoyaltyGuidelines(): {
    streaming: Record<string, string>;
    traditional: Record<string, string>;
    sync: Record<string, string>;
  } {
    return {
      streaming: {
        'Spotify': '$0.003-$0.005 per stream',
        'Apple Music': '$0.007-$0.01 per stream',
        'YouTube': '$0.002-$0.004 per stream',
        'Amazon Music': '$0.004-$0.007 per stream',
        'Tidal': '$0.01-$0.013 per stream'
      },
      traditional: {
        'Major Label': '15-18% of net receipts',
        'Independent Label': '50-70% of net receipts',
        'DIY Distribution': '85-100% of net receipts',
        'Publishing (Admin Deal)': '85-90% of publishing royalties',
        'Publishing (Co-Pub)': '50-75% of publishing royalties'
      },
      sync: {
        'TV (Network)': '$2,000-$10,000',
        'TV (Cable)': '$500-$5,000',
        'Film (Indie)': '$500-$5,000',
        'Film (Major)': '$10,000-$250,000',
        'Advertising (Local)': '$500-$5,000',
        'Advertising (National)': '$25,000-$500,000',
        'Video Game': '$2,500-$75,000'
      }
    };
  }
}

// Export singleton instance
export const industryKnowledge = new IndustryKnowledge();

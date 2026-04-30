import { describe, expect, it } from 'vitest';
import { buildJoinTripUrl, getAppBaseUrl } from '../utils/shareUrl';

describe('share URL building', () => {
        it('keeps the GitHub Pages project path when Vite uses a relative base', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy.github.io', pathname: '/travel-planner-pro/' } as Location,
                        './',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-123')).toBe(
                        'https://amitzahy.github.io/travel-planner-pro/#/join/share-123',
                );
        });

        it('keeps the current directory when the app was loaded from index.html', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy.github.io', pathname: '/travel-planner-pro/index.html' } as Location,
                        './',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-123')).toBe(
                        'https://amitzahy.github.io/travel-planner-pro/#/join/share-123',
                );
        });

        it('uses an absolute Vite base when one is configured', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy.github.io', pathname: '/anything/' } as Location,
                        '/travel-planner-pro/',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-123')).toBe(
                        'https://amitzahy.github.io/travel-planner-pro/#/join/share-123',
                );
        });

        it('lets deployment override the public app URL explicitly', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy.github.io', pathname: '/travel-planner-pro/' } as Location,
                        './',
                        'https://travel.example.com/app',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-123')).toBe(
                        'https://travel.example.com/app/#/join/share-123',
                );
        });

        it('falls back to the GitHub Pages repository path from root github.io links', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy1.github.io', pathname: '/' } as Location,
                        './',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-123')).toBe(
                        'https://amitzahy1.github.io/TravelPlannerAI/#/join/share-123',
                );
        });

        it('normalizes malformed GitHub Pages origins with a trailing dot', () => {
                const baseUrl = getAppBaseUrl(
                        { origin: 'https://amitzahy1.github.io.', pathname: '/' } as Location,
                        './',
                );

                expect(buildJoinTripUrl(baseUrl, 'share-1777540554132-b4xh0na')).toBe(
                        'https://amitzahy1.github.io/TravelPlannerAI/#/join/share-1777540554132-b4xh0na',
                );
        });
});

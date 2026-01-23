# F1 Flying Lap - Asset Integration Guide

## 📁 Directory Structure

```
/public/
├── team-logos/          # Team logos (SVG or PNG)
├── assets/
│   ├── drivers/         # Driver photos (PNG with transparent background)
│   ├── cars/            # Car photos (PNG with transparent background)
│   └── garages/         # Garage/pit background photos
```

## 🎨 Asset Requirements

### Team Logos
**Location**: `/public/team-logos/`

**Format**: SVG preferred (scalable), PNG acceptable
**Background**: Transparent
**Dimensions**: Square aspect ratio, minimum 200x200px
**Naming Convention**: `{team-id}.svg` or `{team-id}.png`

**Current Status**:
- ✅ Ferrari: `ferrari-plain.svg`
- ✅ Red Bull: `redbull.svg`
- ❌ Mercedes: Need logo
- ❌ McLaren: Need logo
- ❌ Aston Martin: Need logo
- ❌ Alpine: Need logo
- ❌ Williams: Need logo
- ❌ Haas: Need logo
- ❌ Sauber: Need logo
- ❌ RB: Need logo

**Where to find**: Official team websites, F1 press kits, or high-quality fan resources

---

### Driver Photos
**Location**: `/public/assets/drivers/`

**Format**: PNG with transparent background (cutout)
**Aspect Ratio**: 9:16 (portrait)
**Recommended Dimensions**: 1080x1920px or higher
**Background**: **Transparent** (driver cutout)
**Pose**: Full body, standing, facing slightly inward
**Style**: Official team race suit, helmet optional
**Naming Convention**: `{driver-id}.png`

**Example filenames**:
- `leclerc.png` (Charles Leclerc)
- `hamilton.png` (Lewis Hamilton)
- `verstappen.png` (Max Verstappen)

**Tip**: Position drivers to face inward toward the center in the Versus view. Left driver should face right, right driver should face left.

**Current Status**: All drivers need photos (20 total)

**Where to find**:
- Official F1 media kits
- Team press resources
- High-quality fan renders (ensure transparent background)
- Remove.bg can help create transparent backgrounds

---

### Car Photos
**Location**: `/public/assets/cars/`

**Format**: PNG with transparent background
**Aspect Ratio**: 16:9 (landscape)
**Recommended Dimensions**: 1920x1080px or higher
**Background**: **Transparent**
**Angle**: 3/4 front view or side profile
**Style**: Clean studio render, 2025 season livery
**Naming Convention**: `{team-id}-2025.png`

**Example filenames**:
- `ferrari-2025.png`
- `redbull-2025.png`
- `mercedes-2025.png`

**Note**: One car per team (not per driver, since teammates share the same car)

**Current Status**: All teams need car renders (10 total)

**Where to find**:
- Official team launch photos
- F1 game assets (if licensed)
- High-quality 3D renders from fan communities

---

### Garage/Pit Photos
**Location**: `/public/assets/garages/`

**Format**: JPG or PNG
**Aspect Ratio**: 2:3 or any portrait ratio
**Recommended Dimensions**: 1080x1620px or higher
**Style**: Vertical garage/pit lane photo, team branding visible
**Lighting**: Atmospheric, can be darker/moody
**Naming Convention**: `{team-id}-garage.jpg`

**Example filenames**:
- `ferrari-garage.jpg`
- `redbull-garage.jpg`

**Usage**: Background for team selection grid (Stage 1)

**Current Status**: All teams need garage photos (10 total)

**Where to find**:
- F1 TV paddock footage screenshots
- Official F1 photo galleries
- Team social media (Instagram, Twitter)

---

## 🔧 How to Add Assets

### Step 1: Add files to the correct directory
Place your assets in the appropriate folder following the naming conventions above.

### Step 2: Update `lib/data.ts`

**For Team Logos**:
```typescript
{
  id: "mercedes",
  name: "Mercedes-AMG Petronas",
  logoUrl: "/team-logos/mercedes.svg", // ← Update this
  // ...
}
```

**For Driver Photos**:
```typescript
{
  id: "hamilton",
  name: "Lewis Hamilton",
  photoUrl: "/assets/drivers/hamilton.png", // ← Update this
  carPhotoUrl: "/assets/cars/ferrari-2025.png", // ← Add car
  // ...
}
```

**For Garage Photos**:
```typescript
{
  id: "ferrari",
  name: "Scuderia Ferrari",
  garagePhotoUrl: "/assets/garages/ferrari-garage.jpg", // ← Update this
  // ...
}
```

### Step 3: Verify in browser
The app will automatically display your assets. If you see placeholders, the path might be incorrect.

---

## 🎯 Priority Order

### Phase 2A - Essential Visual Assets (Do First)
1. **Team Logos** (8 remaining) - Most visible, shows up in all stages
2. **Driver Photos** (20 total) - Core of the Versus and Detail views

### Phase 2B - Polish Assets (Do Second)
3. **Car Photos** (10 total) - Adds impact to Detail view
4. **Garage Photos** (10 total) - Enhances Team Grid atmosphere

---

## 🖼️ Image Optimization Tips

### For Best Performance:
1. **Compress images** before adding:
   - Use TinyPNG for PNGs
   - Use ImageOptim or Squoosh for JPGs
   - Target < 500KB per image

2. **Use WebP format** (optional):
   - Even better compression than PNG/JPG
   - Next.js Image component supports it automatically

3. **Driver/Car PNGs**:
   - Must have clean transparent backgrounds
   - Remove white halos/artifacts
   - Use anti-aliasing for smooth edges

---

## 🚨 Common Issues

### "Image not showing"
- Check file path is correct (case-sensitive)
- Verify file exists in `/public/` directory
- Check browser console for 404 errors
- Hard refresh (Cmd+Shift+R) to clear cache

### "Logo looks wrong size"
- SVGs scale automatically - perfect size will be applied
- PNGs should be high resolution (min 400x400px)

### "Driver photo has white background"
- Use remove.bg or Photoshop to remove background
- Export as PNG-24 with transparency
- Check alpha channel is properly exported

### "Colors look off"
- Team colors are defined in `lib/data.ts` under `gradientStops`
- Adjust hex values if needed to match official team colors

---

## 📊 Asset Checklist

### Teams (10)
- [ ] Ferrari (✅ Logo only)
- [ ] Red Bull (✅ Logo only)
- [ ] Mercedes
- [ ] McLaren
- [ ] Aston Martin
- [ ] Alpine
- [ ] Williams
- [ ] Haas
- [ ] Sauber
- [ ] RB

### Drivers (20)
Ferrari:
- [ ] Charles Leclerc (#16)
- [ ] Lewis Hamilton (#44)

Red Bull:
- [ ] Max Verstappen (#1)
- [ ] Liam Lawson (#30)

Mercedes:
- [ ] George Russell (#63)
- [ ] Andrea Kimi Antonelli (#12)

McLaren:
- [ ] Lando Norris (#4)
- [ ] Oscar Piastri (#81)

Aston Martin:
- [ ] Fernando Alonso (#14)
- [ ] Lance Stroll (#18)

Alpine:
- [ ] Pierre Gasly (#10)
- [ ] Jack Doohan (#7)

Williams:
- [ ] Alexander Albon (#23)
- [ ] Carlos Sainz (#55)

Haas:
- [ ] Esteban Ocon (#31)
- [ ] Oliver Bearman (#87)

Sauber:
- [ ] Nico Hulkenberg (#27)
- [ ] Gabriel Bortoleto (#5)

RB:
- [ ] Yuki Tsunoda (#22)
- [ ] Isack Hadjar (#6)

---

## 🎬 Next Steps

1. **Gather team logos** (highest priority - 8 remaining)
2. **Test with 2-3 complete teams** (Ferrari + Red Bull + one more)
3. **Verify animations work with real images**
4. **Add remaining assets gradually**

---

## 💡 Pro Tips

- Start with one complete team (logo + 2 drivers + car + garage) to see the full effect
- Use consistent lighting/style across all driver photos
- Driver cutouts should be high quality - this is the hero visual
- Car renders look best with slight shadow underneath
- Garage photos can be darker/moodier for dramatic effect

---

**Questions? Check `/lib/data.ts` for the exact structure and current asset paths.**

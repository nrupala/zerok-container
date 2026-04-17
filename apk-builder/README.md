# APK Creator

Simplified Android APK builder for GitHub Actions - downloads Gradle directly, handles version control.

## Quick Start

1. **Create repo from this template** or clone this repo
2. **Add your Android project** in the `android/` directory
3. **Set version** in `VERSION` file
4. **Push to main** - APK builds automatically

## Directory Structure

```
.
├── .github/
│   └── workflows/
│       └── main.yml          # GitHub Actions workflow
├── android/
│   ├── app/
│   │   └── src/main/
│   │       └── AndroidManifest.xml
│   ├── app/build.gradle
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle/wrapper/
│       └── gradle-wrapper.properties
├── VERSION                  # App version (e.g., "1.0.0")
└── README.md
```

## VERSION File

Create or edit the `VERSION` file in root:

```bash
echo "1.0.0" > VERSION
```

The workflow reads this file to name the APK artifact.

## Required Android Files

### android/build.gradle
```groovy
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath "com.android.tools.build:gradle:8.2.2"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

### android/settings.gradle
```groovy
rootProject.name = "my-app"
include(":app")
```

### android/app/build.gradle
```groovy
plugins {
    id "com.android.application"
}

android {
    namespace "com.example.myapp"
    compileSdk 34

    defaultConfig {
        applicationId "com.example.myapp"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName rootProject.file("../../VERSION").text.trim()
    }

    buildTypes {
        debug {
            debuggable true
        }
    }
}

dependencies {}
```

### android/app/src/main/AndroidManifest.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:label="My App">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

## Triggering the Build

### Method 1: Push to Main Branch
```bash
git push origin main
```
APK builds automatically.

### Method 2: Create a Version Tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Method 3: Manual Trigger (GitHub UI)
1. Go to **Actions** → **Android APK Build**
2. Click **Run workflow**
3. Click **Run workflow** button

## Build Output

- APK artifact: `app-{VERSION}.apk`
- Download from: Actions → run → Artifacts

## Workflow Features

| Feature | Description |
|---------|-----------|
| Auto version reading | Reads from VERSION file |
| Default version | Falls back to 0.0.0 if missing |
| Gradle download | Downloads Gradle 8.2 automatically |
| Artifact naming | Includes version in filename |
| Debug logs | Uploads on failure |

## Customization

### Change Gradle Version
Edit `android/gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
```

### Change Android SDK Version
Edit `android/app/build.gradle`:
```groovy
compileSdk 35
targetSdk 35
```

### Change App ID
Edit `android/app/build.gradle`:
```groovy
applicationId "com.yourcompany.yourapp"
```
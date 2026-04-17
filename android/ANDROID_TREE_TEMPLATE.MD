android/

├── gradlew                     # Gradle wrapper (required)

├── gradlew.bat

├── settings.gradle              # Lists modules (must include :app)

├── build.gradle                 # Top-level Gradle config

├── gradle/

│   └── wrapper/

│       ├── gradle-wrapper.jar

│       └── gradle-wrapper.properties

│

└── app/                         # ← THE APP MODULE

&#x20;   ├── build.gradle             # App build config (APK rules)

&#x20;   ├── proguard-rules.pro

&#x20;   │

&#x20;   └── src/

&#x20;       └── main/                # ← Everything below goes into APK

&#x20;           ├── AndroidManifest.xml

&#x20;           │

&#x20;           ├── java/            # Java/Kotlin source code

&#x20;           │   └── io/

&#x20;           │       └── zerok/

&#x20;           │           └── container/

&#x20;           │               └── MainActivity.java

&#x20;           │

&#x20;           └── res/             # Resources (XML, layouts, strings)

&#x20;               ├── layout/

&#x20;               │   └── activity\_main.xml

&#x20;               └── values/

&#x20;                   └── strings.xml


with open('App/src/pages/SettingsPage.tsx', 'r') as f:
    text = f.read()
text = text.replace('className="flex w-full"', 'className="flex w-full gap-2"')
with open('App/src/pages/SettingsPage.tsx', 'w') as f:
    f.write(text)

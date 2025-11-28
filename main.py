import discord
from discord.ext import commands
import os
import asyncio
import logging

# Setup logging (Professional practice for debugging in Zeabur logs)
logging.basicConfig(level=logging.INFO)

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix="!",
            intents=discord.Intents.default(),
            help_command=None
        )

    async def setup_hook(self):
        # Load the extension (cog)
        try:
            await self.load_extension("image_cog")
            # Sync slash commands
            await self.tree.sync()
            logging.info("✅ Commands Synced!")
        except Exception as e:
            logging.error(f"Failed to load extension: {e}")

    async def on_ready(self):
        logging.info(f"🚀 Logged in as {self.user} (ID: {self.user.id})")
        await self.change_presence(activity=discord.Activity(
            type=discord.ActivityType.watching, 
            name="/imagine"
        ))

async def main():
    # Get token from Zeabur Environment Variable
    token = os.getenv("DISCORD_TOKEN")
    
    if not token:
        logging.error("❌ ERROR: DISCORD_TOKEN is missing in Environment Variables!")
        return

    bot = MyBot()
    async with bot:
        await bot.start(token)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

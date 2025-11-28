import discord
from discord import app_commands
from discord.ext import commands
import aiohttp
import os
import logging

# --- BUTTON VIEW CLASS ---
class ImageView(discord.ui.View):
    def __init__(self, images, title, user):
        super().__init__(timeout=300) # Buttons expire after 5 mins
        self.images = images
        self.current_page = 0
        self.title = title
        self.user = user
        self.total_pages = len(images)
        
        # Update button states immediately
        self.update_buttons()

    def update_buttons(self):
        # Disable "Previous" if on first page
        self.children[0].disabled = (self.current_page == 0)
        # Disable "Next" if on last page
        self.children[1].disabled = (self.current_page == self.total_pages - 1)

    def get_embed(self):
        image_url = self.images[self.current_page]
        
        embed = discord.Embed(
            title=f"🔎 {self.title}",
            description=f"Result {self.current_page + 1} of {self.total_pages}",
            color=discord.Color.gold()
        )
        embed.set_image(url=image_url)
        embed.set_footer(text=f"Requested by {self.user.name} | Google Images")
        return embed

    @discord.ui.button(label="◀ Previous", style=discord.ButtonStyle.secondary)
    async def prev_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.user:
            return await interaction.response.send_message("❌ This is not your search session.", ephemeral=True)
            
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.get_embed(), view=self)

    @discord.ui.button(label="Next ▶", style=discord.ButtonStyle.primary)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.user:
            return await interaction.response.send_message("❌ This is not your search session.", ephemeral=True)

        if self.current_page < self.total_pages - 1:
            self.current_page += 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.get_embed(), view=self)

    @discord.ui.button(label="🗑️ Close", style=discord.ButtonStyle.danger)
    async def close_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.user:
            return await interaction.response.send_message("❌ This is not your search session.", ephemeral=True)
        await interaction.message.delete()


# --- COG CLASS ---
class ImageSearch(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.cx_id = os.getenv("GOOGLE_CX_ID")

    @app_commands.command(name="imgsearch", description="Search Google for images")
    @app_commands.describe(query="What image do you want to find?")
    async def imgsearch(self, interaction: discord.Interaction, query: str):
        # 1. Check for keys
        if not self.api_key or not self.cx_id:
            await interaction.response.send_message("❌ Bot configuration error: Missing Google API Keys.", ephemeral=True)
            return

        await interaction.response.defer()

        # 2. Call Google API
        # We fetch 10 images (num=10)
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": query,
            "cx": self.cx_id,
            "key": self.api_key,
            "searchType": "image",
            "num": 10,  # Max allowed by Google per page
            "safe": "active" # 'active' or 'off'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        await interaction.followup.send(f"❌ Google API Error: {response.status}")
                        return
                    
                    data = await response.json()

            # 3. Process Results
            if "items" not in data:
                await interaction.followup.send(f"❌ No images found for '{query}'.")
                return

            # Extract image URLs
            image_urls = [item['link'] for item in data['items']]

            # 4. Create View with Buttons
            view = ImageView(image_urls, query, interaction.user)
            await interaction.followup.send(embed=view.get_embed(), view=view)

        except Exception as e:
            logging.error(f"Search error: {e}")
            await interaction.followup.send("❌ An error occurred while searching.")

async def setup(bot: commands.Bot):
    await bot.add_cog(ImageSearch(bot))

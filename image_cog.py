import discord
from discord import app_commands
from discord.ext import commands
import aiohttp
import io
import random
import urllib.parse
import logging

class ImageGenerator(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="imagine", description="Generate an image using Pollinations AI")
    @app_commands.describe(
        prompt="Describe the image you want",
        model="Choose an AI model",
        width="Image width (default 1024)",
        height="Image height (default 1024)",
        seed="Random seed (optional)"
    )
    @app_commands.choices(model=[
        app_commands.Choice(name="Flux (Best Quality)", value="flux"),
        app_commands.Choice(name="Turbo (Fast)", value="turbo"),
        app_commands.Choice(name="Midjourney", value="midjourney"),
        app_commands.Choice(name="Deliberate", value="deliberate"),
    ])
    async def imagine(
        self, 
        interaction: discord.Interaction, 
        prompt: str, 
        model: app_commands.Choice[str] = None,
        width: int = 1024,
        height: int = 1024,
        seed: int = None
    ):
        await interaction.response.defer()

        # Defaults
        selected_model = model.value if model else "flux"
        if seed is None:
            seed = random.randint(0, 999999)
        
        # URL Safe Prompt
        safe_prompt = urllib.parse.quote(prompt)
        
        # Build URL
        url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width={width}&height={height}&seed={seed}&model={selected_model}&nologo=true"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        await interaction.followup.send(f"❌ API Error: {response.status}")
                        return
                    
                    data = await response.read()

            file = discord.File(io.BytesIO(data), filename="image.png")
            
            embed = discord.Embed(
                title=f"🎨 {prompt[:50]}...",
                color=discord.Color.from_rgb(255, 0, 136) # Nice Pollinations Pink/Purple
            )
            embed.set_image(url="attachment://image.png")
            embed.set_footer(text=f"Model: {selected_model} | Seed: {seed} | User: {interaction.user.name}")

            await interaction.followup.send(file=file, embed=embed)

        except Exception as e:
            logging.error(f"Error generating image: {e}")
            await interaction.followup.send("❌ Something went wrong while generating the image.")

async def setup(bot: commands.Bot):
    await bot.add_cog(ImageGenerator(bot))

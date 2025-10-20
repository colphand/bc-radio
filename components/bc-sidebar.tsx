"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useAlbums } from "@/contexts/AlbumContext"
import {
    IconMusic,
    IconHome,
    IconPlaylist,
    IconUser,
} from "@tabler/icons-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar"

interface Album {
    id: string;
    title: string;
    artist?: string;
    artId?: string;
    itemUrl?: string;
}

interface BCSidebarProps extends React.ComponentProps<typeof Sidebar> {
    onAlbumClick?: (album: Album) => void;
}

export function BCSidebar({ onAlbumClick, ...props }: BCSidebarProps) {
    const { albums, currentUser } = useAlbums();

    const handleAlbumClick = (album: Album) => {
        if (onAlbumClick) {
            onAlbumClick(album);
        } else {
            // Default behavior: navigate to the album URL
            if (album.itemUrl) {
                window.open(album.itemUrl, '_blank');
            }
        }
    };

    const navMain = [
        {
            title: "Home",
            url: "/",
            icon: IconHome,
        },
        {
            title: "Collection",
            url: "/collection",
            icon: IconMusic,
        },
        {
            title: "Playlists",
            url: "#playlists",
            icon: IconPlaylist,
        },
    ];

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <IconMusic className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">BC Radio</span>
                                    <span className="truncate text-xs">Music Player</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Albums Collection */}
                {albums.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>
                            Albums {currentUser && `(${currentUser})`}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {albums.slice(0, 20).map((album) => (
                                    <SidebarMenuItem key={album.id}>
                                        <SidebarMenuButton
                                            onClick={() => handleAlbumClick(album)}
                                            className="h-auto p-2"
                                        >
                                            <div className="flex items-center space-x-2 min-w-0">
                                                {album.artId && (
                                                    <Image
                                                        src={`https://f4.bcbits.com/img/a${album.artId}_1.jpg`}
                                                        alt={album.title}
                                                        width={32}
                                                        height={32}
                                                        className="size-8 rounded object-cover shrink-0"
                                                    />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {album.title}
                                                    </div>
                                                    {album.artist && (
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {album.artist}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                                {albums.length > 20 && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton disabled>
                                            <span className="text-xs text-muted-foreground">
                                                ...and {albums.length - 20} more albums
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                            <IconUser />
                            <span>{currentUser || 'Guest'}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}